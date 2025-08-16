import { withClass, type WithChildren } from './WithChildren';
import styles from './Layout.module.css';

export const Layout = withClass(styles.layout);
export const LayoutHeader = withClass(styles.layoutHeader);
export const LayoutMain = withClass(styles.layoutMain);
export const LayoutSidebar = withClass(styles.layoutSidebar);
