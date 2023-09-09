import { z } from "zod";
import { type ClipboardEvent } from "react";
import { api } from "./api";

export const smartClip = (e: ClipboardEvent<HTMLTextAreaElement>) => {
  const items = e.clipboardData.items;
  for (const item of items) {
    if (item.type.indexOf("text") !== -1) {
      const text = e.clipboardData.getData("text/plain");
      if (z.string().url().safeParse(text).success) {
        return `[link](${text})`;
      }
      return;
    } else if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      if (file) {
        const res = api.form.createPresignedUrl.useQuery().data;
        if (!res) return;
        const { url, fields } = res;
        const formData = new FormData();
        Object.entries({
          ...fields,
          file,
          "Content-Type": file.type,
        }).forEach(([key, value]) => {
          formData.append(key, value);
        });
        void fetch(url, {
          method: "POST",
          body: formData,
        });
        return `![image](${url})`;
      }
      return;
    }
  }
};
