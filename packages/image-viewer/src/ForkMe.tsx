const styles = {
    top: 0,
    left: 0,
    position: 'absolute',
} as const;

export function ForkMe() {
    return (
        <a href="https://github.com/tinktinp/img-viewer">
            <img
                style={styles}
                loading="lazy"
                decoding="async"
                width="125"
                height="125"
                src="https://github.blog/wp-content/uploads/2008/12/forkme_left_darkblue_121621.png"
                alt="Fork me on GitHub"
            />
        </a>
    );
}
