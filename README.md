# neo-front-tools

## Install

```bash
npm i @kront/neo-front-tools
```

## Dev 建议使用yalc 下面命令是简单使用npm link

```bash
pnpm install
```

```bash
pnpm dev
# pnpm build
```

```bash

cd neo-front-tools
npm link

# 再去项目目录通过包名来 link
cd use-neo-front-tools
npm link @kront/neo-front-tools

# 解除link
# 解除项目与模块的link，在项目目录下，npm unlink 模块名
# 解除模块全局的link，在模块目录下，npm unlink 模块名
```

## LICENSE

MIT
