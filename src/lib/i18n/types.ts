export type Dictionary = {
  // App / General
  appName: string;
  loading: string;
  loadingProject: string;

  // Header
  headerToggleSidebar: string;
  headerOpenFolder: string;
  headerRefreshTree: string;
  headerToggleTasksSidebar: string;
  headerMascot: string;
  headerSettings: string;
  headerNewInstance: string;

  // Tree Item context menu
  treeOpen: string;
  treeCollapse: string;
  treeExpand: string;
  treeRename: string;
  treeCopyPath: string;
  treeMoveHere: string;
  treeFailedMove: string;
  treeFailedRename: string;
  treeFormat: string;
  editorFormat: string;

  // Tab Panel
  tabNewTerminal: string;
  tabClose: string;
  tabSplitHorizontal: string;
  tabSplitVertical: string;
  tabClosePanel: string;
  tabCloseTab: string;
  tabRename: string;
  tabFormat: string;
  tabPin: string;
  tabUntitled: string;
  tabHintOpenFile: string;
  tabMoveHere: string;
  tabUnsavedChangesTitle: string;
  tabUnsavedChangesBody: string;
  tabClosePanelBody: string;

  // Dialogs (AppLayout)
  dialogQuitTitle: string;
  dialogQuitBody: string;
  dialogSwitchProjectTitle: string;
  dialogSwitchProjectBody: string;

  // Settings Modal
  settingsTitle: string;
  settingsTabGeneral: string;
  settingsTabEditor: string;
  settingsTabTerminal: string;
  settingsTabGit: string;
  settingsUiFontSize: string;
  settingsZoom: string;
  settingsRestoreLayout: string;
  settingsTheme: string;
  settingsThemeDark: string;
  settingsThemeLight: string;
  settingsThemeAuto: string;
  settingsLanguage: string;
  settingsLanguageEnglish: string;
  settingsLanguageSpanish: string;
  settingsMascotScope: string;
  settingsMascotGlobal: string;
  settingsMascotPerProject: string;
  settingsEditorFontSize: string;
  settingsEditorLineHeight: string;
  settingsEditorWordWrap: string;
  settingsEditorTabSize: string;
  settingsEditorInsertSpaces: string;
  settingsEditorShowLineNumbers: string;
  settingsEditorHighlightActiveLine: string;
  settingsEditorMinimap: string;
  settingsTerminalDefaultShell: string;
  settingsTerminalShellPlaceholder: string;
  settingsTerminalScrollback: string;
  settingsTerminalCopyOnSelect: string;
  settingsGitRefreshInterval: string;
  settingsGitShowIndicators: string;
  settingsCancel: string;
  settingsApply: string;

  // Status Bar
  statusCopyPath: string;
  statusPathCopied: string;
  statusFormat: string;
  statusCpu: string;
  statusRam: string;
  statusUtf8: string;
  statusLf: string;
  statusCrlf: string;

  // Approval Modal
  approvalTitle: string;
  approvalNo: string;
  approvalYes: string;

  // Image / Audio / Editor
  mediaLoading: string;

  // Markdown Viewer
  markdownRaw: string;
  markdownPreview: string;
  markdownCtrlClick: string;

  // URL Toast
  toastOpenPreview: string;
  toastExternal: string;
  toastDismiss: string;

  // Web Preview
  previewDesktop: string;
  previewMobile: string;
  previewRefresh: string;
  previewOpenBrowser: string;
  previewLoading: string;

  // Terminal
  terminalOpenPreview: string;
  terminalFailedStart: string;

  // Split Container
  splitRemoveSplit: string;

  // Process Footer
  processLaunched: string;
  processName: string;
  processPid: string;
  processCpu: string;
  processRam: string;
  processPath: string;
  processNoActive: string;
  processPathCopied: string;

  // Sidebar Footer
  sidebarGitBranch: string;
  sidebarChangedFiles: string;
  sidebarNoGit: string;

  // Todo Panel
  todoNoTasks: string;
  todoAddSection: string;
  todoProgressComplete: string;
  todoProgress: string;
  todoRenameSection: string;
  todoDeleteSection: string;
  todoDeleteTask: string;
  todoMoveTo: string;
  todoAddTaskPlaceholder: string;
  todoSectionPlaceholder: string;
  todoNewSection: string;
  todoDefaultSection: string;
  todoSectionTodo: string;
  todoSectionInProgress: string;
  todoSectionDone: string;
  todoTaskFirst: string;
  todoTaskWorking: string;
  todoTaskCompleted: string;

  // Loading Screen
  loadingScreenDefault: string;

  // Mascot
  mascotDisabled: string;
  mascotCompact: string;
  mascotAnimated: string;
  mascotSmall: string;
  mascotNormal: string;
  mascotTestSound: string;
  mascotTestVoice: string;
  mascotSound: string;
  mascotVoice: string;
  mascotVolume: string;
  mascotLanguage: string;
  mascotTone: string;
  mascotGenderMan: string;
  mascotGenderWoman: string;
  mascotGenderBoy: string;
  mascotGenderGirl: string;
  mascotNoMascotLoaded: string;
  mascotNoMascots: string;
  mascotImportFromFolder: string;
  mascotName: string;
  mascotSlug: string;
  mascotFrame: string;
  mascotFramesPerState: string;
  mascotFramesPerRow: string;
  mascotLoop: string;
  mascotStates: string;
  mascotConfig: string;
  mascotMascots: string;
  mascotAppearance: string;
  mascotAudio: string;
  mascotEventMappings: string;
  mascotPhrases: string;
  mascotManualStates: string;
  mascotInfo: string;
  mascotScopeGlobal: string;
  mascotScopeProject: string;
  mascotRow: string;
  mascotNoPhrase: string;

  // Mascot Event Labels
  eventIdle: string;
  eventWaitingResponse: string;
  eventTaskDone: string;
  eventError: string;
  eventStartingTask: string;
  eventKeepWorking: string;
  eventGetAttention: string;
  eventWaitingCommand: string;
  eventTerminalClosed: string;
  eventTerminalCreated: string;
  eventPanelSplit: string;
  eventPreviewOpened: string;
  eventFileRenamed: string;
  eventImageOpened: string;
  eventAudioOpened: string;
  eventMaximized: string;
  eventRestored: string;
  eventApprovalRequest: string;

  // Mascot Default Phrases
  phraseIdle: string;
  phraseTaskDone: string;
  phraseError: string;
  phraseStartingTask: string;
  phraseKeepWorking: string;
  phraseWaitingResponse: string;
  phraseWaitingCommand: string;
  phraseTerminalClosed: string;
  phraseTerminalCreated: string;
  phrasePanelSplit: string;
  phrasePreviewOpened: string;
  phraseFileRenamed: string;
  phraseImageOpened: string;
  phraseAudioOpened: string;
  phraseMaximized: string;
  phraseRestored: string;
  phraseApprovalRequest: string;

  // Terminal default title
  terminalDefaultTitle: string;
};
