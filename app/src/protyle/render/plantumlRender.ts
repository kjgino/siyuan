import {addScript} from "../util/addScript";
import {Constants} from "../../constants";
import {genIconHTML} from "./util";
import {hasClosestByClassName} from "../util/hasClosest";

import {fetchPost} from "../../util/fetch";

/**
 * !includeを削除するヘルパー関数
 * @param content PlantUMLの元のテキスト
 * @returns !include行が削除されたPlantUMLテキスト
 */
function removeIncludes(content: string): string {
    // !include行を削除
    return content.replace(/^!include\s+.+$/gm, "");
}

export const plantumlRender = async (element: Element, cdn = Constants.PROTYLE_CDN) => {
    let plantumlElements: Element[] = [];
    if (element.getAttribute("data-subtype") === "plantuml") {
        plantumlElements = [element];
    } else {
        plantumlElements = Array.from(element.querySelectorAll('[data-subtype="plantuml"]'));
    }
    if (plantumlElements.length === 0) {
        return;
    }
    await addScript(`${cdn}/js/plantuml/plantuml-encoder.min.js?v=0.0.0`, "protylePlantumlScript");

    const wysiswgElement = hasClosestByClassName(element, "protyle-wysiwyg", true);

    await Promise.all(
        plantumlElements.map(async (e: HTMLDivElement) => {
            if (e.getAttribute("data-render") === "true") {
                return;
            }
            if (!e.firstElementChild.classList.contains("protyle-icons")) {
                e.insertAdjacentHTML("afterbegin", genIconHTML(wysiswgElement));
            }
            const renderElement = e.firstElementChild.nextElementSibling as HTMLElement;
            try {
                // 元のPlantUMLテキストを取得
                const originalContent = Lute.UnEscapeHTMLStr(e.getAttribute("data-content"));
                // !includeを解決
                const resolvedContent = await resolveIncludes(originalContent);
                // !includeを削除
                const cleanedContent = removeIncludes(resolvedContent);        
                // エンコードしてレンダリング
                renderElement.innerHTML = `<object type="image/svg+xml" data=${window.siyuan.config.editor.plantUMLServePath}${window.plantumlEncoder.encode(cleanedContent)}"/>`;
                renderElement.classList.remove("ft__error");
                e.setAttribute("data-render", "true");
            } catch (error) {
                renderElement.classList.add("ft__error");
                renderElement.innerHTML = `plantuml render error: <br>${error}`;
            }
        })
    );
};

/**
 * !includeを解決するヘルパー関数
 * @param content PlantUMLの元のテキスト
 * @returns !includeが解決されたPlantUMLテキスト
 */
async function resolveIncludes(content: string): Promise<string> {
    const includePattern = /^!include\s+(.+)$/gm;
    let match;
    let resolvedContent = content;

    while ((match = includePattern.exec(content)) !== null) {
        const filePath = match[1].trim();
        try {
            // ファイルの内容を取得 (ここではfetchを使用)
            const fileContent = await getFile(filePath);
            // !includeディレクティブをファイルの内容で置換
            resolvedContent = resolvedContent.replace(match[0], fileContent);
        } catch (error) {
            console.error(`Error resolving include for ${filePath}:`, error);
        }
    }
    return resolvedContent;
}

export async function getFile(path: string): Promise<any> {
    let data = {
        path: path
    }
    let url = '/api/file/getFile';
    return new Promise((resolve, _) => {
        fetchPost(url, data, (content: any) => {
            resolve(content)
        });
    });
}
