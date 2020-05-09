import { RendererLike } from '@connectv/html';
import { ThemedComponentThis } from '@connectv/jss-theme';
import { CodedocTheme } from '@codedoc/core';

import { HeroStyle } from './style';


export interface HeroOptions {
  src: string;
  mode?: 'light' | 'dark';
}


export function Hero(
  this: ThemedComponentThis<CodedocTheme>,
  options: HeroOptions,
  renderer: RendererLike<any, any>,
  content: any,
) {
  console.log(options.src);
  const classes = this.theme.classes(HeroStyle);
  const opts: {[key: string]: string} = { class: classes.hero };
  if (options.mode) opts['data-mode'] = options.mode;
  return <fragment>
    <img src={options.src} {...opts}/>
    <span class={classes.caption}>{content}</span>
  </fragment>;
}