(function (global) {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inlineMd(text) {
    let s = escapeHtml(text);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
    s = s.replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1<em>$2</em>");
    s = s.replace(
      /\[([^\]]+)\]\((https?:[^)\s]+|[^)\s]+)\)/g,
      function (_, label, href) {
        const safe = String(href).replace(/"/g, "");
        const ext = /^https?:/i.test(safe);
        return (
          '<a href="' +
          safe +
          '"' +
          (ext ? ' target="_blank" rel="noopener noreferrer"' : "") +
          ">" +
          label +
          "</a>"
        );
      }
    );
    return s;
  }

  function markdownToHtml(md) {
    const src = String(md || "").replace(/\r\n/g, "\n");
    const lines = src.split("\n");
    const out = [];
    let i = 0;
    let inUl = false;
    let inOl = false;
    let inBq = false;

    function closeLists() {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (inOl) { out.push("</ol>"); inOl = false; }
    }
    function closeBq() {
      if (inBq) { out.push("</blockquote>"); inBq = false; }
    }
    function closeBlocks() {
      closeLists();
      closeBq();
    }

    while (i < lines.length) {
      const line = lines[i];

      // fenced code
      const fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        closeBlocks();
        const lang = fence[1] || "";
        i += 1;
        const buf = [];
        while (i < lines.length && !/^```\s*$/.test(lines[i])) {
          buf.push(lines[i]);
          i += 1;
        }
        i += 1;
        if (lang.toLowerCase() === "mermaid") {
          // Trusted README content — render as a live diagram node
          out.push(
            '<div class="mermaid-wrap"><div class="mermaid">' +
              buf.join("\n").replace(/<\/(script)/gi, "&lt;/$1") +
              "</div></div>"
          );
        } else {
          out.push(
            '<pre class="md-code' +
              (lang ? " language-" + escapeHtml(lang) : "") +
              '"><code>' +
              escapeHtml(buf.join("\n")) +
              "</code></pre>"
          );
        }
        continue;
      }

      if (/^\s*$/.test(line)) {
        closeBlocks();
        i += 1;
        continue;
      }

      if (/^---+\s*$/.test(line) || /^\*\*\*+\s*$/.test(line)) {
        closeBlocks();
        out.push("<hr />");
        i += 1;
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        closeBlocks();
        const level = heading[1].length;
        out.push("<h" + level + ">" + inlineMd(heading[2]) + "</h" + level + ">");
        i += 1;
        continue;
      }

      if (/^>\s?/.test(line)) {
        closeLists();
        if (!inBq) { out.push("<blockquote>"); inBq = true; }
        out.push("<p>" + inlineMd(line.replace(/^>\s?/, "")) + "</p>");
        i += 1;
        continue;
      } else {
        closeBq();
      }

      const ul = line.match(/^\s*[-*+]\s+(.*)$/);
      if (ul) {
        closeBq();
        if (inOl) { out.push("</ol>"); inOl = false; }
        if (!inUl) { out.push("<ul>"); inUl = true; }
        out.push("<li>" + inlineMd(ul[1]) + "</li>");
        i += 1;
        continue;
      }

      const ol = line.match(/^\s*\d+\.\s+(.*)$/);
      if (ol) {
        closeBq();
        if (inUl) { out.push("</ul>"); inUl = false; }
        if (!inOl) { out.push("<ol>"); inOl = true; }
        out.push("<li>" + inlineMd(ol[1]) + "</li>");
        i += 1;
        continue;
      }

      // table (simple GFM)
      if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:-]+\|/.test(lines[i + 1])) {
        closeBlocks();
        const splitRow = function (row) {
          return row
            .replace(/^\s*\|/, "")
            .replace(/\|\s*$/, "")
            .split("|")
            .map(function (c) { return c.trim(); });
        };
        const headers = splitRow(line);
        i += 2;
        out.push("<table class=\"md-table\"><thead><tr>");
        headers.forEach(function (h) {
          out.push("<th>" + inlineMd(h) + "</th>");
        });
        out.push("</tr></thead><tbody>");
        while (i < lines.length && /\|/.test(lines[i]) && !/^\s*$/.test(lines[i])) {
          const cells = splitRow(lines[i]);
          out.push("<tr>");
          cells.forEach(function (c) {
            out.push("<td>" + inlineMd(c) + "</td>");
          });
          out.push("</tr>");
          i += 1;
        }
        out.push("</tbody></table>");
        continue;
      }

      closeLists();
      // paragraph: gather consecutive text lines
      const para = [line];
      i += 1;
      while (
        i < lines.length &&
        !/^\s*$/.test(lines[i]) &&
        !/^#{1,6}\s/.test(lines[i]) &&
        !/^```/.test(lines[i]) &&
        !/^\s*[-*+]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i]) &&
        !/^>\s?/.test(lines[i]) &&
        !/^---+\s*$/.test(lines[i])
      ) {
        para.push(lines[i]);
        i += 1;
      }
      out.push("<p>" + inlineMd(para.join(" ")) + "</p>");
    }

    closeBlocks();
    return out.join("\n");
  }

  global.FSMarkdown = { toHtml: markdownToHtml };
})(window);
