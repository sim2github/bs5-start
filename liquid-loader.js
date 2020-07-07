const loaderUtils = require('loader-utils')
const { Liquid } = require('liquidjs')

module.exports = function(content) {
  const m = this
  if (this.cacheable) this.cacheable()

  const config = loaderUtils.getOptions(this)
  const callback = this.async()

  const Engine = new Liquid({
    root: config.root || '',
    extname: config.extname || '.liquid',
    dev: config.dev || false
  })

  const tmpl = Engine.parse(content)

  function recursiveDependency(array) {
    if (Array.isArray(array)) {
      array.forEach(function(e) {
        if (e.impl) {
          if (e.impl.file) {
            m.addDependency(
              Engine.options.root +
                e.impl.file.input.replace(/^["']|["']$/g, '') +
                Engine.options.extname
            )
          }
          if (e.impl.tpls) recursiveDependency(e.impl.tpls)
        }
      })
    }
  }
  if (Engine.options.dev) {
    recursiveDependency(tmpl)
  }

  Engine.render(tmpl, config.data || {})
    .then(function(html) {
      return callback(null, html)
    })
    .catch(function(err) {
      return callback(err, null)
    })
}
