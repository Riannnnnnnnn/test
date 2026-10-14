import { toPng } from "html-to-image";

export async function downloadReportImage(node: HTMLElement, fileName: string): Promise<void> {
  await document.fonts?.ready;
  const image = await toPng(node, {
    backgroundColor: "#ffffff",
    cacheBust: true,
    pixelRatio: 2,
    style: {
      margin: "0",
      maxWidth: "none",
    },
    filter: (element) => !(element instanceof HTMLElement && element.dataset.exportExclude === "true"),
  });

  const link = document.createElement("a");
  link.download = fileName;
  link.href = image;
  link.click();
}
