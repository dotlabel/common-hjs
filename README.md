# common-hjs

> Collects up partials and layouts and punts them through a base template

## Getting Started

```sh
npm i common-hjs
```

```sh
hulk compile -b src/views/base.hjs \
  -d data.json \
  -p 'src/{common,bundles}/**/*.hjs' \
  -o dist
```

This will compile the templates, using `base.hjs` as a base, it will then search the glob specified with `-p` for `index.hjs` files to use as layouts and everything else will become a partial for use within the base or the layouts. `-d` specifies the data to render the templates with.

## Example

```
.
└── src
    ├── bundles
    │   ├── bundleA
    │   │   ├── component.hjs
    │   │   └── index.hjs
    │   └── bundleB
    │       └── index.hjs
    ├── common
    │   └── header.hjs
    └── views
        └── base.hjs
```

Given this file structure the templates would get grouped like this:

```
// Partials
component
header

// Layouts
bundleA/index
bundleB/index

// Base
base
```

The filenames are currently important and partials should have unique names or `common-hjs` will complain when trying to compile them. The layouts are all called `index` but this doesn’t matter because they get added to the partials as a `body` only when rendering the `base` template. Currently only one base can be specified per compile.

```mustache
<!-- base -->
<body>
  {{> header }}
  <h1>Base</h1>
  {{> body }}
</body>
```

```mustache
<!-- bundleA -->
<section>
  <h2>Bundle A</h2>
  {{> component }}
</section>
```

```mustache
<!-- bundleB -->
<section>
  <h2>Bundle B</h2>
</section>
```

These file contents would all render out pretty much as you would probably expect, where `bundleA` and `bundleB` get inserted as the body and all the other partials use their naked filename to include them.

Putting partials inside bundles is incredibly useful and having this naming restriction is pretty rubbish, so that’s on the todo list. For now a bit of namespacing and you’re all good.

Templates can be accessed from anywhere so they’re effectively global, ditto for the data you’re passing in. Another roadmap item is merging `json` files to allow some data separation, pull requests welcomed.

---

Enjoy responsibly!
