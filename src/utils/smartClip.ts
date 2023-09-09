import { useEffect, type ClipboardEvent } from "react";
import { z } from "zod";
import { api } from "./api";

export const useSmartClip = ({
  e,
  onFound,
} : {
  e: ClipboardEvent<HTMLTextAreaElement> | null;
  onFound: (text: string) => void;
}) => {
  useEffect(() => {
    void (async () => {
      if (!e) return;
      const items = e.clipboardData.items;
      console.log(e.clipboardData);
      for (const item of items) {
        if (item.type.indexOf("text") !== -1) {
          const text = e.clipboardData.getData("text/plain");
          if (z.string().url().safeParse(text).success) {
            onFound(`[link](${text})`);
          }
          return;
        } else if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            const res = await api
              .useContext()
              .client.form.createPresignedUrl.query();
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
            onFound(`![image](${url})`);
          }
          return;
        }
      }
    })();
  }, [e, onFound]);
};
