import styles from './Loading.module.css';

export interface LoadingProps {
    isLoading?: boolean;
}

export function LoadingInner() {
    return <div className={styles.loadingInner}>Loading...</div>;
}
export function Loading({ isLoading = true }: LoadingProps) {
    if (!isLoading) return null;

    return (
        <div className={styles.loading}>
            <LoadingInner />
        </div>
    );
}
