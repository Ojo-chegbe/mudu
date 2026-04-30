/* Inline SVG icon components for the sidebar & UI */

const s = { width: "20px", height: "20px", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function IconHome() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>;
}
export function IconQuestionBank() {
  return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/><circle cx="12" cy="16.5" r=".5" fill="currentColor" stroke="none"/></svg>;
}
export function IconCourses() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M7 4v16"/><path d="M11 8h6M11 12h4"/></svg>;
}
export function IconStudents() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
export function IconSettings() {
  return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
export function IconDocs() {
  return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>;
}
export function IconSearch() {
  return <svg viewBox="0 0 24 24" {...s}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
}
export function IconBell() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}
export function IconPlus() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M12 5v14M5 12h14"/></svg>;
}
export function IconMoreVertical() {
  return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></svg>;
}
export function IconCopy() {
  return <svg viewBox="0 0 24 24" {...s}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
}
export function IconChevronRight() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>;
}
export function IconUpload() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
}
export function IconCheck() {
  return <svg viewBox="0 0 24 24" {...s}><polyline points="20 6 9 17 4 12"/></svg>;
}
export function IconX() {
  return <svg viewBox="0 0 24 24" {...s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
export function IconTrash() {
  return <svg viewBox="0 0 24 24" {...s}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
}
export function IconEdit() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
export function IconArchive() {
  return <svg viewBox="0 0 24 24" {...s}><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
}
export function IconDownload() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}
export function IconPlay() {
  return <svg viewBox="0 0 24 24" {...s}><polygon points="5 3 19 12 5 21 5 3"/></svg>;
}
export function IconMonitor() {
  return <svg viewBox="0 0 24 24" {...s}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
}
export function IconBarChart() {
  return <svg viewBox="0 0 24 24" {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}
export function IconRefresh() {
  return <svg viewBox="0 0 24 24" {...s}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
}
export function IconFolder() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
}
export function IconClock() {
  return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
export function IconFlag() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
}
export function IconWifi() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>;
}
export function IconGrid() {
  return <svg viewBox="0 0 24 24" {...s}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
}
export function IconList() {
  return <svg viewBox="0 0 24 24" {...s}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}
export function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.1667 2.5L14.1667 5.83333" stroke="#9C9C9C" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M5.83325 2.5L5.83325 5.83333" stroke="#9C9C9C" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M2.5 9C2.5 7.11438 2.5 6.17157 3.08579 5.58579C3.67157 5 4.61438 5 6.5 5H13.5C15.3856 5 16.3284 5 16.9142 5.58579C17.5 6.17157 17.5 7.11438 17.5 9V9.16667H2.5V9Z" stroke="#9C9C9C" strokeWidth="1.2"/>
      <rect x="2.5" y="5" width="15" height="12.5" rx="2" stroke="#9C9C9C" strokeWidth="1.2"/>
    </svg>
  );
}
export function IconHistoryClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12.7243 5C9.38336 5 6.5625 7.18038 5.71443 10.1407H4.43042C4.35078 10.1412 4.27282 10.1628 4.20511 10.2031C4.13739 10.2435 4.08255 10.301 4.04661 10.3694C4.01067 10.4378 3.99502 10.5145 4.00139 10.5909C4.00776 10.6673 4.03589 10.7406 4.08271 10.8026L5.92351 13.2269C5.96368 13.28 6.01633 13.3233 6.07715 13.353C6.13797 13.3828 6.20525 13.3984 6.27349 13.3984C6.34173 13.3984 6.40901 13.3828 6.46983 13.353C6.53065 13.3233 6.5833 13.28 6.62347 13.2269L8.46087 10.8026C8.50774 10.7405 8.53588 10.6672 8.54221 10.5906C8.54853 10.5141 8.53279 10.4374 8.49671 10.3689C8.46063 10.3005 8.40562 10.243 8.33774 10.2027C8.26986 10.1624 8.19175 10.141 8.11203 10.1407H6.92686C7.73236 7.8012 10.0189 6.12026 12.7243 6.12026C16.1049 6.12026 18.8353 8.74463 18.8353 11.9995C18.8353 15.2543 16.1049 17.8797 12.7243 17.8797C10.7096 17.8797 8.82654 16.9237 7.68705 15.3241C7.59967 15.202 7.46555 15.1182 7.3141 15.0911C7.16265 15.0641 7.00623 15.0959 6.87914 15.1797C6.81585 15.2214 6.76174 15.2747 6.71992 15.3366C6.6781 15.3985 6.64939 15.4677 6.63545 15.5403C6.62151 15.6129 6.62262 15.6874 6.6387 15.7596C6.65478 15.8317 6.68552 15.9001 6.72915 15.9609C8.0849 17.864 10.3273 19 12.7243 19C16.7338 19 20 15.8597 20 11.9995C20 8.1392 16.7338 5 12.7243 5ZM12.3209 8.45268C12.2445 8.45297 12.1689 8.46774 12.0984 8.49616C12.0279 8.52457 11.964 8.56607 11.9102 8.61829C11.8563 8.6705 11.8137 8.73241 11.7848 8.80048C11.7558 8.86855 11.7411 8.94144 11.7414 9.015V12.4797C11.7413 12.5709 11.7644 12.6607 11.8085 12.7413C11.8527 12.822 11.9166 12.891 11.9948 12.9425L13.9526 14.229C14.0798 14.3127 14.2364 14.3444 14.3878 14.3171C14.5393 14.2899 14.6733 14.2058 14.7605 14.0835C14.8471 13.9611 14.8798 13.8107 14.8515 13.6651C14.8232 13.5196 14.7361 13.3907 14.6094 13.3068L12.9049 12.1821V9.015C12.9052 8.94108 12.8903 8.86783 12.8611 8.79947C12.8318 8.73112 12.7888 8.66901 12.7345 8.61674C12.6803 8.56447 12.6157 8.52306 12.5447 8.4949C12.4738 8.46674 12.3977 8.45239 12.3209 8.45268Z" fill="#9C9C9C"/>
    </svg>
  );
}
export function IconRocket() {
  return (
    <svg width="20" height="20" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_148_1353)">
        <path d="M7.66239 6.33761L3.72029 10.2797M4.14573 7.41876L2.21483 6.96266C2.00239 6.91248 1.92767 6.64874 2.08157 6.49429L3.61714 4.95872C3.72029 4.85557 3.86025 4.79646 4.00689 4.79535L5.73818 4.78029M7.91887 2.79921C9.20744 3.67796 10.322 4.79256 11.2008 6.08113M6.58068 9.85427L7.03678 11.7852C7.08696 11.9976 7.3507 12.0723 7.50515 11.9184L9.04072 10.3829C9.14388 10.2797 9.20298 10.1398 9.2041 9.99311L9.21915 8.26182M11.5314 5.17506L11.982 3.00719C12.1046 2.41727 11.5827 1.89537 10.9928 2.01804L8.82494 2.46856C8.18651 2.60127 7.60105 2.91742 7.14049 3.37854L5.36181 5.15666C4.68323 5.83523 4.24163 6.7151 4.10224 7.66466L4.0961 7.70536C4.00801 8.31145 4.21096 8.92311 4.64365 9.35635C5.07633 9.78904 5.68855 9.992 6.29464 9.90334L6.33535 9.89721C7.2849 9.75837 8.16477 9.31621 8.84334 8.63763L10.6215 6.85951C11.0826 6.39895 11.3987 5.81349 11.5314 5.17506Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <defs>
        <clipPath id="clip0_148_1353">
          <rect width="12" height="12" fill="white" transform="translate(1 1)"/>
        </clipPath>
      </defs>
    </svg>
  );
}

export function IconSidebarCollapse() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 2.5V17.5M6.5 2.5H13.5C14.9001 2.5 15.6002 2.5 16.135 2.77248C16.6054 3.01217 16.9878 3.39462 17.2275 3.86502C17.5 4.3998 17.5 5.09987 17.5 6.5V13.5C17.5 14.9001 17.5 15.6002 17.2275 16.135C16.9878 16.6054 16.6054 16.9878 16.135 17.2275C15.6002 17.5 14.9001 17.5 13.5 17.5H6.5C5.09987 17.5 4.3998 17.5 3.86502 17.2275C3.39462 16.9878 3.01217 16.6054 2.77248 16.135C2.5 15.6002 2.5 14.9001 2.5 13.5V6.5C2.5 5.09987 2.5 4.3998 2.77248 3.86502C3.01217 3.39462 3.39462 3.01217 3.86502 2.77248C4.3998 2.5 5.09987 2.5 6.5 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
