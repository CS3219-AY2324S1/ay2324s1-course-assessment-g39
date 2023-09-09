import { z } from "zod";
import { type ClipboardEvent } from "react";

export const smartClip = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
  const items = e.clipboardData.items;
  for (const item of items) {
    if (item.type.indexOf("text") !== -1) {
      const text = e.clipboardData.getData("text/plain");
      if (z.string().url().safeParse(text).success) {
        e.preventDefault();
        return `[link](${text})`;
      }
      break;
    } else if (item.type.indexOf("image") !== -1) {
        // TODO
    //   const blob = item.getAsFile();
    //   const reader = new FileReader();
    //   reader.onload = function (event) {
    //     const dataURL = event.target?.result;
    //     if (dataURL) {
    //       e.preventDefault();
    //       return `![image](${dataURL})`;
    //     }
    //   };
    //   blob && reader.readAsDataURL(blob);
      break;
    }
  }
};
