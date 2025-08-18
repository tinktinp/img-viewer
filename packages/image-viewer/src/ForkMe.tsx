import styles from './ForkMe.module.css';
import forkMe from './forkme_left_darkblue_121621.png';

export function ForkMe() {
    return (
        <a href="https://github.com/tinktinp/img-viewer">
            <img
                className={styles.forkMe}
                loading="lazy"
                decoding="async"
                width="125"
                height="125"
                src={forkMe}
                alt="Fork me on GitHub"
            />
        </a>
    );
}
