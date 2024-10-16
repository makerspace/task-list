type Board = {
    id: string,
    nodeId: string,
    name: string,
    desc: string,
    descData: null,
    closed: boolean,
    dateClosed: string | null,
    idOrganization: string,
    idEnterprise: string | null,
    limits: BoardLimits,
    pinned: boolean,
    starred: any,
    url: string,
    prefs: any,
    shortLink: string,
    subscribed: any | null,
    labelNames: LabelNames,
    powerUps: any[],
    dateLastActivity: string | null,
    dateLastView: string | null,
    shortUrl: string,
    idTags: any[],
    datePluginDisable: string | null,
    creationMethod: any | null,
    ixUpdate: string,
    templateGallery: any | null,
    enterpriseOwned: boolean,
    idBoardSource: any | null,
    premiumFeatures: string[],
    idMemberCreator: string,
    type: any | null,
    actions: object[],
    cards: Card[],
    labels: Label[],
    lists: List[]
    members: Member[]
    checklists: Checklist[]
}

type Checklist = {
    id: string,
    idBoard: string,
    idCard: string,
    name: string,
    pos: number,
    checkItems: CheckItem[]
}

type CheckItem = {
    id: string,
    name: string,
    state: "complete" | "incomplete",
    idChecklist: string,
    pos: number,
    due: string | null,
    idMember: string | null,
}

type Member = {
    id: string,
    aaId: string,
    activityBlocked: boolean,
    avatarHash: string,
    avatarUrl: string,
    bio: string
    bioData: object | null,
    confirmed: boolean,
    fullName: string,
    idEnterprise: any | null,
    idEnterprisesDeactivated: any[],
    idMemberReferrer: any | null,
    idPremOrgsAdmin: any,
    initials: string,
    memberType: string,
    nonPublic: object,
    nonPublicAvailable: boolean,
    products: any[],
    url: string,
    username: string,
    status: string,
}

type CheckItemState = {
    idCheckItem: string,
    state: "complete" | "incomplete"
}

type Card = {
    id: string,
    address: any | null,
    badges: object,
    checkItemStates: CheckItemState[],
    closed: boolean,
    coordinates: any | null,
    creationMethod: any | null,
    creationMethodError: any | null,
    dueComplete: boolean,
    dateLastActivity: string,
    dateViewedByCreator: any | null,
    desc: string,
    descData: object,
    due: any | null,
    dueReminder: any | null,
    email: any | null,
    idBoard: string,
    idChecklists: string[],
    idLabels: string[],
    idList: string,
    idMemberCreator: any | null,
    idMembers: string[],
    idMembersVoted: string[],
    idOrganization: string,
    idShort: number,
    idAttachmentCover: string | null,
    labels: Label[],
    limits: object[],
    locationName: string | null,
    manualCoverAttachment: boolean,
    name: string,
    nodeId: string,
    pinned: boolean,
    pos: number,
    shortLink: string,
    shortUrl: string,
    sourceEmail: string | null,
    staticMapUrl: string | null,
    start: any | null,
    subscribed: any | null,
    url: string,
    cover: {
        idAttachment: string | null,
        color: string | null,
        idUploadedBackground: string | null,
        size: string,
        brightness: string,
        idPlugin: string | null
    },
    isTemplate: boolean,
    cardRole: any | null,
    mirrorSourceId: any | null,
    attachments: CardAttachment[],
    pluginData: any[],
    customFieldItems: any[]
}

type CardAttachment = {
    id: string,
    bytes: number,
    date: string
    edgeColor: string,
    idMember: string,
    isUpload: boolean,
    mimeType: string,
    name: string,
    previews: any[],
    url: string,
    pos: number,
    fileName: string,
}

type List = {
    id: string,
    name: string,
    closed: boolean,
    color: any | null,
    idBoard: string,
    pos: number,
    subscribed: any | null,
    softLimit: any | null,
    type: any | null,
    dataSource: object,
    creationMethod: any | null,
    idOrganization: string,
    limits: any,
    nodeId: string,
}

type LabelColor = (
    "green" |
    "yellow" |
    "orange" |
    "red" |
    "purple" |
    "blue" |
    "sky" |
    "lime" |
    "pink" |
    "black" |
    "green_dark" |
    "yellow_dark" |
    "orange_dark" |
    "red_dark" |
    "purple_dark" |
    "blue_dark" |
    "sky_dark" |
    "lime_dark" |
    "pink_dark" |
    "black_dark" |
    "green_light" |
    "yellow_light" |
    "orange_light" |
    "red_light" |
    "purple_light" |
    "blue_light" |
    "sky_light" |
    "lime_light" |
    "pink_light" |
    "black_light"
)

type Label = {
    id: string,
    idBoard: string,
    name: string,
    color: LabelColor,
    uses: number
}

type LabelNames = {
    [P in LabelColor]: string
}
type BoardLimits = any;