<script lang="ts">
  import {
    Folder,
    FolderOpen,
    File,
    FileJs,
    FileTs,
    FileJsx,
    FileTsx,
    FileHtml,
    FileCss,
    FileMd,
    FilePy,
    FileRs,
    FileC,
    FileCpp,
    FileCSharp,
    FileSql,
    FileCode,
    FileText,
    FileImage,
    FilePng,
    FileJpg,
    FileSvg,
    FileAudio,
    FileVideo,
    FileCsv,
    FileTxt,
    FilePdf,
    FileDoc,
    FilePpt,
    FileXls,
    FileZip,
    FileVue,
    Terminal,
    Globe,
  } from "phosphor-svelte";

  let {
    path,
    size = 16,
    type,
    weight = "regular",
  }: {
    path?: string;
    size?: number;
    type?: "folder" | "folder-open" | "terminal" | "preview" | "file";
    weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  } = $props();

  const COLORS: Record<string, string> = {
    js: "#f1e05a",
    ts: "#60a5fa",
    jsx: "#67e8f9",
    tsx: "#60a5fa",
    json: "#f1e05a",
    html: "#fb923c",
    htm: "#fb923c",
    css: "#a78bfa",
    scss: "#f472b6",
    sass: "#f472b6",
    md: "#60a5fa",
    markdown: "#60a5fa",
    py: "#60a5fa",
    rs: "#fb923c",
    c: "#9ca3af",
    cpp: "#fb7185",
    h: "#fb7185",
    hpp: "#fb7185",
    cs: "#4ade80",
    sql: "#fbbf24",
    png: "#4ade80",
    jpg: "#4ade80",
    jpeg: "#4ade80",
    gif: "#4ade80",
    webp: "#4ade80",
    svg: "#4ade80",
    bmp: "#4ade80",
    ico: "#4ade80",
    tiff: "#4ade80",
    tif: "#4ade80",
    mp3: "#c084fc",
    wav: "#c084fc",
    ogg: "#c084fc",
    flac: "#c084fc",
    m4a: "#c084fc",
    aac: "#c084fc",
    wma: "#c084fc",
    opus: "#c084fc",
    mp4: "#f87171",
    mov: "#f87171",
    avi: "#f87171",
    mkv: "#f87171",
    csv: "#2dd4bf",
    txt: "#9ca3af",
    pdf: "#f87171",
    doc: "#60a5fa",
    docx: "#60a5fa",
    ppt: "#fb923c",
    pptx: "#fb923c",
    xls: "#4ade80",
    xlsx: "#4ade80",
    zip: "#fbbf24",
    rar: "#fbbf24",
    tar: "#fbbf24",
    gz: "#fbbf24",
    vue: "#34d399",
    go: "#22d3ee",
    java: "#fbbf24",
    php: "#818cf8",
    rb: "#f87171",
    sh: "#a3e635",
    bash: "#a3e635",
    zsh: "#a3e635",
    dockerfile: "#38bdf8",
    xml: "#2dd4bf",
    yaml: "#f87171",
    yml: "#f87171",
  };

  function getIcon(): any {
    if (type === "folder") return Folder;
    if (type === "folder-open") return FolderOpen;
    if (type === "terminal") return Terminal;
    if (type === "preview") return Globe;

    const ext = path?.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, any> = {
      js: FileJs,
      ts: FileTs,
      jsx: FileJsx,
      tsx: FileTsx,
      json: FileCode,
      html: FileHtml,
      htm: FileHtml,
      css: FileCss,
      scss: FileCss,
      sass: FileCss,
      md: FileMd,
      markdown: FileMd,
      py: FilePy,
      rs: FileRs,
      c: FileC,
      cpp: FileCpp,
      h: FileCpp,
      hpp: FileCpp,
      cs: FileCSharp,
      sql: FileSql,
      png: FilePng,
      jpg: FileJpg,
      jpeg: FileJpg,
      gif: FileImage,
      webp: FileImage,
      svg: FileSvg,
      bmp: FileImage,
      ico: FileImage,
      tiff: FileImage,
      tif: FileImage,
      mp3: FileAudio,
      wav: FileAudio,
      ogg: FileAudio,
      flac: FileAudio,
      m4a: FileAudio,
      aac: FileAudio,
      wma: FileAudio,
      opus: FileAudio,
      mp4: FileVideo,
      mov: FileVideo,
      avi: FileVideo,
      mkv: FileVideo,
      csv: FileCsv,
      txt: FileTxt,
      pdf: FilePdf,
      doc: FileDoc,
      docx: FileDoc,
      ppt: FilePpt,
      pptx: FilePpt,
      xls: FileXls,
      xlsx: FileXls,
      zip: FileZip,
      rar: FileZip,
      tar: FileZip,
      gz: FileZip,
      vue: FileVue,
      go: FileCode,
      java: FileCode,
      php: FileCode,
      rb: FileCode,
      sh: FileCode,
      bash: FileCode,
      zsh: FileCode,
      dockerfile: FileCode,
      xml: FileCode,
      yaml: FileCode,
      yml: FileCode,
    };
    return map[ext] ?? FileText;
  }

  function getColor(): string | undefined {
    if (type === "folder" || type === "folder-open") return "#dcb67a";
    if (type === "terminal") return "#4caf50";
    if (type === "preview") return "#4a9eff";
    const ext = path?.split(".").pop()?.toLowerCase() ?? "";
    return COLORS[ext];
  }

  const Icon = $derived(getIcon());
  const iconColor = $derived(getColor());
</script>

<span class="file-icon" style:color={iconColor}>
  <Icon {size} {weight} />
</span>

<style>
  .file-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
</style>
