export function csvContent(rows: (string | number)[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value);
            const safe =
              /^[\s]*[=+@-]/.test(text) && typeof value !== "number"
                ? "'" + text
                : text;
            return '"' + safe.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}

export function downloadReport(filename: string, rows: (string | number)[][]) {
  const url = URL.createObjectURL(
    new Blob([csvContent(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
