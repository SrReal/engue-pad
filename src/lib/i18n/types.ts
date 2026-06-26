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
  headerNewWindow: string;
  headerSettings: string;
  headerSearchPlaceholder: string;

  // Tree Item context menu
  treeOpen: string;
  treeCollapse: string;
  treeExpand: string;
  treeOpenInTerminal: string;
  treeRevealInFinder: string;
  treeRename: string;
  treeDelete: string;
  treeDeleteConfirm: string;
  treeCopyPath: string;
  treeCopyRelativePath: string;
  treeMoveHere: string;
  treeFailedMove: string;
  treeFailedRename: string;
  treeFailedDelete: string;
  treeFailedReveal: string;
  treeFailedCreateFile: string;
  treeFailedCreateFolder: string;
  treeNewFilePrompt: string;
  treeNewFolderPrompt: string;
  treeFormat: string;
  editorFormat: string;
  treeSearch: string;
  treeNewFile: string;
  treeNewFolder: string;
  treeRefresh: string;

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
  tabBarAriaLabel: string;
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
  settingsEditorFontSize: string;
  settingsEditorLineHeight: string;
  settingsEditorWordWrap: string;
  settingsEditorTabSize: string;
  settingsEditorInsertSpaces: string;
  settingsEditorShowLineNumbers: string;
  settingsEditorHighlightActiveLine: string;
  settingsEditorMinimap: string;
  settingsEditorAutoSave: string;
  settingsEditorAutoSaveOff: string;
  settingsEditorAutoSaveFocus: string;
  settingsEditorAutoSaveDelay: string;
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

  // Terminal default title
  terminalDefaultTitle: string;

  // Search tab suffix
  searchTabFileSuffix: string;

  // Search results
  searchNoResults: string;
  searchResultLine: string;

  // Symbol panel
  symbolPanelTitle: string;
  symbolPanelSearch: string;
  symbolPanelEmpty: string;
  symbolPanelNoResults: string;

  // Welcome screen
  welcomeOpenFolder: string;
  welcomeRecentFolders: string;
  welcomeNoRecent: string;
  welcomeRemoveRecent: string;

  // Right sidebar tabs
  rightSidebarTabTodo: string;
  rightSidebarTabNotes: string;

  // Notes panel
  notesPlaceholder: string;

  // Unsupported file
  unsupportedFileTitle: string;
  unsupportedFileBody: string;
  unsupportedFileOpen: string;
};
