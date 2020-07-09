import { getRenderer } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/transport/renderer.js';
import { initJssCs } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/transport/setup-jss.js';initJssCs();
import { installTheme } from '/home/runner/work/coding-blog/coding-blog/.codedoc/content/theme.ts';installTheme();
import { countCards } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/coding-blog-plugin/dist/es5/components/article-card/count-cards.js';countCards();
import { codeSelection } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/components/code/selection.js';codeSelection();
import { sameLineLengthInCodes } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/components/code/same-line-length.js';sameLineLengthInCodes();
import { initHintBox } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/components/code/line-hint/index.js';initHintBox();
import { initCodeLineRef } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/components/code/line-ref/index.js';initCodeLineRef();
import { initSmartCopy } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/components/code/smart-copy.js';initSmartCopy();
import { copyHeadings } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/components/heading/copy-headings.js';copyHeadings();
import { contentNavHighlight } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/components/page/contentnav/highlight.js';contentNavHighlight();
import { loadDeferredIFrames } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/transport/deferred-iframe.js';loadDeferredIFrames();
import { smoothLoading } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/transport/smooth-loading.js';smoothLoading();
import { tocHighlight } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/components/page/toc/toc-highlight.js';tocHighlight();
import { postNavSearch } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/components/page/toc/search/post-nav/index.js';postNavSearch();
import { CollapseControl } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/components/collapse/collapse-control.js';
import { ToCToggle } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/components/page/toc/toggle/index.js';
import { DarkModeSwitch } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/components/darkmode/index.js';
import { ConfigTransport } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/transport/config.js';
import { ArticleCard } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/coding-blog-plugin/dist/es5/components/article-card/index.js';
import { ToCPrevNext } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/core/dist/es6/components/page/toc/prevnext/index.js';
import { Author } from '/home/runner/work/coding-blog/coding-blog/.codedoc/node_modules/@codedoc/coding-blog-plugin/dist/es5/components/author/index.js';

const components = {
  'r+Jv/VS/YauITdU0M0jN1Q==': CollapseControl,
  'krgrG9oFN9VQUm9kMirw5Q==': ToCToggle,
  'rt07Ne+r5k791oQZALhn6g==': DarkModeSwitch,
  '5C7mlfiypfDBeBwm8QT42g==': ConfigTransport,
  'h50r6483fq/QNydFmoOznA==': ArticleCard,
  'dPH0+SmZ7R38b/oBW5P5Rw==': ToCPrevNext,
  'DmEvOYtw7XYnMs6x+25YJA==': Author
};

const renderer = getRenderer();
const ogtransport = window.__sdh_transport;
window.__sdh_transport = function(id, hash, props) {
  if (hash in components) {
    const target = document.getElementById(id);
    renderer.render(renderer.create(components[hash], props)).after(target);
    target.remove();
  }
  else if (ogtransport) ogtransport(id, hash, props);
}
