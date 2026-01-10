/** biome-ignore-all lint/complexity/useArrowFunction: <explanation> */
import { useEffect, useState } from 'react';
import type { PluginDetailsObj } from '../plugin/plugin';
import styles from './PluginSidebarDetails.module.css';
import type { PluginFancySelectionObj } from './usePluginHandleSelection';

function useDetailsObj(selectionObj: PluginFancySelectionObj) {
    const [detailsObj, setDetailsObj] = useState<
        PluginDetailsObj | undefined
    >();
    useEffect(() => {
        (async function () {
            const detailsObj = await selectionObj.pluginElement.details?.();
            if (detailsObj) {
                setDetailsObj(detailsObj);
            }
        })();
    }, [selectionObj.pluginElement]);

    return detailsObj;
}

export function PluginSidebarDetails({
    selectionObj,
}: {
    selectionObj: PluginFancySelectionObj;
}) {
    const detailsObj = useDetailsObj(selectionObj);

    if (!detailsObj) return;

    return (
        <table className={styles.imageDetails}>
            <caption>{detailsObj.caption}</caption>
            <tbody>
                {detailsObj.row.map((r) => (
                    <tr key={r.key}>
                        <th scope="row">{r.header}</th>
                        <td>{r.data}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
