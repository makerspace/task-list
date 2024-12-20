import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { debounce } from 'ts-debounce';
import "./app.scss";
import ContentEditable, { type ContentEditableEvent } from 'react-contenteditable';
import * as md from 'marked';
import { generateQrCodeImage } from 'dfts-qrcode';
import Icon from '@mdi/react';
import { mdiEye, mdiEyeOffOutline } from '@mdi/js';
import fetchRetry from 'fetch-retry';

// How often to save (at most). In milliseconds
const LoadDebounce = 1000;

const parseBoard = (json: any): Board => {
    if (!json.hasOwnProperty("name")) {
        throw "Invalid board";
    }
    const board = json as Board;

    fixupCardDescriptions(board);
    return board;
}

const fixupCardDescriptions = (board: Board) => {
    for (const card of board.cards) {
        const m = card.desc.match(/Ask: @([a-zA-Z0-9]+) for (instructions|more info)./g);
        if (m !== null) {
            for (const match of m) {
                const memberName = match.match(/@([a-zA-Z0-9]+)/)![1];
                const member = board.members.find(m => m.username == memberName);
                if (member !== undefined) {
                    if (!card.idMembers.includes(member.id)) {
                        card.idMembers.unshift(member.id);
                    }
                    card.desc = card.desc.replace(match, '').trim();
                }
            }
        }
    }
}

const groupCardsByLabel = (cards: Card[], board: Board): Map<Label | null, Card[]> => {
    const groups = new Map<Label | null, Card[]>();
    cards.forEach(card => {
        const labelId = card.labels.length > 0 ? card.labels[0]!.id : null;
        const label = board.labels.find(l => l.id == labelId) ?? null;
        if (!groups.has(label)) {
            groups.set(label, []);
        }
        groups.get(label)!.push(card);
    });
    return groups;
}

type ListWithCards = { list: List, cards: Card[] }[];

const groupCardsByList = (board: Board): ListWithCards => {
    const groups = new Map<string, Card[]>();
    board.cards.forEach(card => {
        if (card.closed) return;

        if (!groups.has(card.idList)) {
            groups.set(card.idList, []);
        }
        groups.get(card.idList)!.push(card);
    });

    return board.lists.map(list => {
        if (!groups.has(list.id)) {
            groups.set(list.id, []);
        }
        const cards = groups.get(list.id)!;
        cards.sort((a, b) => a.pos - b.pos);

        return {
            list,
            cards
        }
    });
}

const isImage = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
}

const ChecklistItem = ({ checklistItem, state }: { checklistItem: CheckItem, state: "complete" | "incomplete" }) => {
    return <li className="checklist-item">
        <div className={"checkbox " + (state == "complete" ? "checked" : "")} />
        <div className="checklist-item-name">{checklistItem.name}</div>
    </li>
}

const ChecklistComponent = ({ checklistId, board, checkItemStates }: { checklistId: string, board: Board, checkItemStates: CheckItemState[] }) => {
    const checklist = board.checklists.find(cl => cl.id == checklistId);
    if (checklist == undefined) return null;

    const checkItems = checklist.checkItems.map(ci => {
        const state = checkItemStates.find(cis => cis.idCheckItem == ci.id)?.state ?? "incomplete";
        return <ChecklistItem key={ci.id} checklistItem={ci} state={state} />;
    });

    return <ol className="checklist">
        {checkItems}
    </ol>
}

class DescriptionRenderer extends md.Renderer {
    override paragraph(p: md.Tokens.Paragraph): string {
        // Note: u200B/u200C/u200D are zero-width space characters, uFEFF is a zero-width no-break space
        p.tokens = p.tokens.filter(t => !(t.type == "text" && t.text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim() == ""));
        if (p.tokens.length == 0) return "";
        const inner = this.parser.parseInline(p.tokens);
        if (inner.trim() == "") return "";
        return `<p>${inner}</p>\n`
    }

    override image(_img: md.Tokens.Image): string {
        return ""
    }

    override link({ href, title, tokens }: md.Tokens.Link): string {
        const qr = generateQrCodeImage(href, { margin: 1 });

        title = title ?? "";
        title = title.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        if (title == "" || title == "smartCard-inline") {
            title = "More info";
        }

        if (title != "") {
            return `<div class="qr-code"><img src="${qr.dataUrl}"/><span>${title}</span></div>`;
        } else {
            return `<div class="qr-code"><img src="${qr.dataUrl}"/></div>`;
        }
    }
}

const DummyCardComponent = () => {
    return < div className="card dummy" >
        <div className="card-started checkbox" />
        <div className="card-done checkbox" />
        <div className="card-name"></div>
        <div className="card-assigned"></div>
        {<div className="card-des" />}
    </div >
}

const CardComponent = ({ card, board, visible, onSetVisible }: { card: Card, board: Board, visible: boolean, onSetVisible: ((f: (visible: boolean) => boolean) => void) }) => {
    const assigned = card.idMembers.map(id => board.members.find(m => m.id == id)?.fullName).filter(n => n !== undefined).join(', ');
    const desc = useMemo(() => {
        const marked = new md.Marked();
        return marked.parse(card.desc, {
            renderer: new DescriptionRenderer(),
            async: false,
        });
    }, [card.desc]);

    return < div className={`card ${visible ? '' : 'hidden'}`} >
        <div className="card-visible" onClick={() => onSetVisible(v => !v)}>
            {visible && <Icon path={mdiEye} />}
            {!visible && <Icon path={mdiEyeOffOutline} />}
        </div>
        <div className="card-started checkbox" />
        <div className="card-done checkbox" />
        <div className="card-name">{card.name}</div>
        <div className="card-assigned">{assigned}</div>
        {desc.length > 0 && <div className="card-desc" dangerouslySetInnerHTML={{ __html: desc }} />}
        {card.attachments.length > 0 && <div className="card-attachments">{card.attachments.filter(a => isImage(a.mimeType)).map(a => <img key={a.id} src={a.url} />)}</div>}
        {card.idChecklists.length > 0 && <div className="card-checklists">{card.idChecklists.map(cl => <ChecklistComponent key={cl} checklistId={cl} board={board} checkItemStates={card.checkItemStates} />)}</div>}
    </div >
}

const ListComponent = ({ list, cards, board, hiddenCards, onChangeHiddenCards, dummyCards }: { list: List, cards: Card[], board: Board, hiddenCards: Set<string>, onChangeHiddenCards: (f: ((v: Set<string>) => Set<string>)) => void, dummyCards: number }) => {
    if (list.closed) return null;


    const groups = groupCardsByLabel(cards, board);
    const groupNames = Array.from(groups.keys());
    groupNames.sort((a, b) => a == null ? -1 : (b == null ? 1 : a.name.localeCompare(b.name)));

    return <>
        {/* <h2>{list.name}</h2> */}
        {groupNames.map(label => {
            const groupCards = groups.get(label)!;
            return <div className='card-group' key={label?.id ?? "null"}>
                <h3>{label != null ? label.name : "General"}</h3>
                <div className="task-grid">
                    <div className="group-header header-started">Started</div>
                    <div className="group-header header-done">Done</div>
                    <div className="group-header header-name">Task</div>
                    <div className="group-header header-assigned">Ask for more info</div>
                    <div className="header-separator" />
                    {groupCards.map(card => <CardComponent
                        card={card}
                        board={board}
                        key={card.id}
                        visible={!hiddenCards.has(card.id)}
                        onSetVisible={updater => onChangeHiddenCards(hiddenCards => {
                            const visible = updater(!hiddenCards.has(card.id));
                            const newSet = new Set(hiddenCards);
                            if (visible) {
                                newSet.delete(card.id);
                            } else {
                                newSet.add(card.id);
                            }
                            return newSet;
                        })}
                    />)}
                    {Array(dummyCards).fill(0).map((_, i) =>
                        <DummyCardComponent
                            key={i}
                        />
                    )}
                </div>
            </div>
        })}
    </>
}

class PersistentEditableText extends React.Component<{ id: string, tag: string, initialValue: string }, { html: string }> {
    contentEditable: React.RefObject<HTMLElement>;

    constructor(props: React.PropsWithoutRef<{ id: string, tag: string, initialValue: string }>) {
        super(props);
        this.contentEditable = React.createRef();
        const key = "editable-" + props.id;
        const storedValue = localStorage.getItem(key);
        const initialValue = storedValue ?? props.initialValue;
        this.state = { html: initialValue };
    }

    handleChange(evt: ContentEditableEvent) {
        const value = evt.target.value;
        this.setState({ html: value });
        const key = "editable-" + this.props.id;
        localStorage.setItem(key, value);
    }

    override render() {
        let html = this.state.html;
        if (document.activeElement !== this.contentEditable.current) {
            html = html.trim();
            html = html.replaceAll(/<br>$/g, '');
            html = html.replaceAll(/^<br>/g, '');
            html = html.replaceAll("&nbsp;", " ");
            html = html.trim();
        }
        return <ContentEditable
            innerRef={this.contentEditable}
            className='editable-text'
            html={html} // innerHTML of the editable div
            disabled={false}       // use true to disable editing
            onChange={(e) => this.handleChange(e)} // handle innerHTML change
            tagName={this.props.tag} // Use a custom HTML tag (uses a div by default)
            onBlur={() => this.setState({})}
        />
    };
};

const LabeledControl = ({ label, children, placeholder }: { label: string, children: React.ReactNode, placeholder?: string }) => {
    return <div className='labeled-control'>
        <label>{label}</label>
        {children}
    </div>
}
const App = () => {
    const defaultBoard = "https://trello.com/b/wcg1eoAv/makerspace-tasks";
    // const defaultBoard = "/makerspace-task";
    const [boardURL, setBoardURL] = useState(defaultBoard);
    const [listNames, setListNames] = useState(() => {
        return localStorage.getItem("listNames")?.split(',') ?? ["Cleaning day"];
    });
    const [date, setDate] = useState(new Date().toLocaleDateString("sv-SE"));
    const [board, setBoard] = useState<Board | null>(null);
    const [hiddenCards, setHiddenCards] = useState(() => {
        const stored = localStorage.getItem("hiddenCards");
        return new Set(stored?.split(',') ?? []);
    });

    const [error, setError] = useState<string | null>(null);

    let debouncedLoad = null;
    debouncedLoad = useCallback(debounce((url: string) => {
        console.log("Loading board", url);
        const f = fetchRetry(fetch);
        f(url + ".json", {
            retryDelay: (attempt, error, response) => Math.pow(2, attempt) * 1000 // 1000, 2000, 4000
        }).then(r => r.json()).then(json => {
            setBoard(parseBoard(json));
            setError(null);
        }).catch(e => {
            console.error(e);
            setBoard(null);
            setError(e.toString());
        });
    }, LoadDebounce, { isImmediate: true }), []);

    useEffect(() => {
        debouncedLoad(boardURL);
    }, []);

    const lists = useMemo(() => board !== null ? groupCardsByList(board) : [], [board]);

    return <>
        <div className='controls'>
            <LabeledControl label='Board URL'>
                <input type="url" value={boardURL} onChange={e => {
                    setBoardURL(e.target.value);
                    debouncedLoad(e.target.value);
                }} />
            </LabeledControl>
            {board?.lists.map(l => {
                if (l.closed) return null;
                return <LabeledControl key={l.id} label={l.name}>
                    <input type="checkbox" checked={listNames.includes(l.name)} onChange={e => {
                        const newNames = e.target.checked ? [...listNames, l.name] : listNames.filter(n => n != l.name);
                        setListNames(newNames);
                        localStorage.setItem("listNames", newNames.join(','));
                    }} />
                </LabeledControl>
            })}
        </div>
        {error !== null && <div className='error'>{error}</div>}
        <div className="page">
            <div className="top">
                <div className="top-left">
                    <PersistentEditableText id="page-header" tag="h1" initialValue="Makerspace Work Day<br/>Autumn Edition" />
                    <input className='page-date' type="date" lang="se-SV" value={date} onChange={e => {
                        setDate(e.target.value);
                    }} />
                </div>
                <div className="top-right">
                    <PersistentEditableText id="header1" tag="h4" initialValue="Work Leaders" />
                    <PersistentEditableText id="content1" tag="p" initialValue="Aron Granberg<br/>Daniel Berglund" />
                    <PersistentEditableText id="header2" tag="h4" initialValue="Schedule" />
                    <PersistentEditableText id="content2" tag="p" initialValue="Start: ~12 PM<br/>Dinner: ~6 PM<br/>End: ~9 PM" />
                </div>
            </div>
            <div className='content'>
                {board != null && lists.filter(l => listNames.includes(l.list.name.trim())).map(({ list, cards }) => <ListComponent
                    key={list.id}
                    list={list}
                    cards={cards}
                    board={board}
                    hiddenCards={hiddenCards}
                    onChangeHiddenCards={updater => {
                        const newHiddenCards = updater(hiddenCards);
                        localStorage.setItem("hiddenCards", Array.from(newHiddenCards).join(','));
                        setHiddenCards(newHiddenCards);
                    }}
                    dummyCards={4}
                />)}
                {board == null && error == null && <div className='loading'>Loading...</div>}
            </div>
        </div>
    </>;
}

console.log("Waiting for load");
const mount = () => {
    console.log("Loaded");
    const container = document.getElementById('app');
    const root = createRoot(container!);
    root.render(<App />);
}

console.log(document.readyState);
if (document.readyState === "loading") document.addEventListener('DOMContentLoaded', mount);
else mount();
