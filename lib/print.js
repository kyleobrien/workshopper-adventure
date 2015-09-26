const fs          = require('fs')
    , path        = require('path')
    , colorsTmpl  = require('colors-tmpl')
    , through     = require('through2')
    , chalk       = require('chalk')
    , msee        = require('msee')
    , split       = require('split')
    , inherits     = require('util').inherits
    , StringStream = require('string-to-stream')
    , CombinedStream = require('combined-stream')
    , mseeOptions = {
          paragraphStart: ''
        , paragraphEnd: '\n\n'
      }

function getText (i18n, contents) {
  contents = colorsTmpl(contents)
    .replace(/\{([^}]+)\}/gi, function (match, k) {
      return i18n.has(k) ? i18n.__(k) : ('{' + k + '}')
    })
    .replace(/\$([A-Z_]+)/g, function (match, k) {
      return i18n.has(k) ? i18n.__(k) : ('$' + k)
    })

  if (i18n.has('appDir'))
    // proper path resolution
    contents = contents.replace(/\{rootdir:([^}]+)\}/gi, function (match, subpath) {
      return 'file://' + path.join(i18n.__('appDir'), subpath)
    })

  return contents
}

function localisedFileName (lang, file) {
  // Since the files that will be printed are subject to user manipulation
  // a null can happen here, checking for it just in case.
  if (file === undefined || file === null)
    return null

  file = file.replace(/\{lang\}/g, lang)
  if (fs.existsSync(file)) {
    var stat = fs.statSync(file)
    if (stat && stat.isFile())
      return file
  }
  return null
}

function localisedFirstFileStream (files, lang) {
  if (files === null)
    return null

  var file = null
  if (!Array.isArray(files)) {
    file = localisedFileName(lang, files)
  } else {
    for (var i = 0; i < files.length && !file; i++) {
      file = localisedFileName(lang, files[i])
    }
  }
  return file ? fs.createReadStream(file, {encoding: 'utf8'}) : null
}

var PrintStream = function (i18n, lang) {
  if (!(this instanceof PrintStream))
    return new PrintStream(i18n, lang)

  CombinedStream.call(this, {})
  this.i18n = i18n
  this.lang = lang
}

inherits(PrintStream, CombinedStream)

PrintStream.prototype._append = CombinedStream.prototype.append

PrintStream.prototype.append = function (content, contentType) {

  var stream = null

  if (typeof content === 'function')
    content = content()

  if (content === null || content === undefined)
    return false

  if (Array.isArray(content)) {
    return content.reduce(function (found, content) {
      return found || this.append(content)
    }.bind(this))
  }

  if (content.hasOwnProperty("files")) {
    var files = content.files
      .map(localisedFileName.bind(null, this.lang))
      .filter(function (file) { file !== null });
    if (files.length > 0) {  
      stream = new PrintStream(this.i18n, this.lang)
      files.forEach(function () {
        stream.append(chalk.yellow(util.repeat('\u2500', 80)))
        if (files.length > 1)
          stream.append(chalk.bold.yellow(file + ':'))
        stream.append({file: file})
      })
      stream.append(chalk.yellow(util.repeat('\u2500', 80)))
      this._append(stream)
      return true
    }
  }

  if (content.hasOwnProperty("file")) {
    stream = localisedFirstFileStream(content.file, this.lang)
    contentType = content.type || contentType || path.extname(content.file).replace(/^\./, '').toLowerCase()
  } else if (content.pipe) {
    stream = content
  } else {
    stream = new StringStream(content + '\n')
  }

  if (!stream)
    return false

  if (!contentType)
    contentType = 'txt'

  var i18n = this.i18n
    , buffer = []

  this._append(
    stream
      .pipe(split())
      .pipe(through(function (contents, encoding, done) {
        buffer.push(getText(i18n, contents.toString()))
        done()
      }, function (done) {
        var contents = buffer.join('\n')
        if (contentType === 'md')
          // convert Markdown to ANSI
          contents = msee.parse(contents, mseeOptions)
        else if (contentType === 'js')
          // code fencing is necessary for msee to render the solution as code
          contents = msee.parse('```js\n' + contents.replace(/^\n/m, '').replace(/\n$/m, '') + '\n```')

        this.push(contents)
        done()
      }))
  )
  return true
}

// appendPlus is a weird name
PrintStream.prototype.appendChain = function (content, type) {
  this.append(content, type)
  return this
}

module.exports = PrintStream