import fs from 'fs';
import path from 'path';

const bundlePath = path.resolve('./node_modules/next/dist/compiled/webpack/bundle5.js');

if (fs.existsSync(bundlePath)) {
  let content = fs.readFileSync(bundlePath, 'utf8');
  const target = '77763:function(v,E,P){"use strict";const{validate:R}=P(38476);';
  const replacement = '77763:function(v,E,P){"use strict";v.exports=function(){};return;const{validate:R}=P(38476);';

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(bundlePath, content, 'utf8');
    console.log('✓ Successfully patched Webpack schema validator for exclamation mark paths.');
  } else if (content.includes(replacement)) {
    console.log('✓ Webpack schema validator is already patched.');
  } else {
    console.log('Notice: Webpack schema validator target signature not found or different version.');
  }
}
