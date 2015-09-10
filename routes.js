let then = require('express-then')
let multiparty = require('multiparty')
let isLoggedIn = require('./middleware/isLoggedIn')
let Post = require('./models/post')
let fs = require('fs')
let User = require('./user')
let DataUri = require('datauri')

module.exports = (app) => {
  let passport = app.passport

  app.get('/', (req, res) => {
    res.render('index.ejs')
  })

  app.get('/login', (req, res) => {
    res.render('login.ejs', {message: req.flash('error')})
  })

  app.get('/signup', (req, res) => {
    res.render('signup.ejs', {message: req.flash('error')})
  })

  app.post('/login', passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
  }))
  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile',
    failureRedirect: '/signup',
    failureFlash: true
  }))

  app.get('/profile', isLoggedIn, (req, res) => {
    res.render('profile.ejs', {
      user: req.user,
      message: req.flash('error')
    })
  })

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  app.get('/post/:postId?', isLoggedIn, then(async (req, res) => {
    let postId = req.params.postId
    // if post id is not given in the url
    if (!postId) {
      res.render('post.ejs', {
        post: {},
        verb: 'Create',
        message: req.flash('error')
      })
      return
    }
    // get existing blog post
    let post = await Post.promise.findById(postId)
    if (!post) return res.send(404, 'Not Found')

    let dataUri = new DataUri
    let image = dataUri.format('.' + post.image.contentType.split('/').pop(), post.image.data)
    res.render('post.ejs', {
      post: post,
      verb: 'Edit',
      image: `data:${post.image.contentType};base64,${image.base64}`,
      message: req.flash('error')
    })
  }))
  
  app.get('/blog/:blogTitle', then(async (req, res) => {
    // req.params gets the blogTitle from url 
    let user = await User.promise.findOne({blogTitle: req.params.blogTitle})
    let rawArray = await Post.promise.find({})
    let processedArray = [];
    
    // add title, content and formatted image data to a new array and send to blog.ejs
    let count = 0;
    for (let i = 0; i < rawArray.length; i++) {
      let elem = rawArray[i]

      let dataUri = new DataUri
      let image = dataUri.format('.' + elem.image.contentType.split('/').pop(), elem.image.data)
      processedArray.push({
        "title": elem.title,
        "content": elem.content,
        "image": `data:${elem.image.contentType};base64,${image.base64}`
      })
    }

    res.render('blog.ejs', {
      processedArray: processedArray,
      message: req.flash('error')
    })
  }))

  app.post('/post/:postId?', isLoggedIn, then(async (req, res) => {
    // req.params gets the postId from url 
    let postId = req.params.postId
    // find by the id if the blog post is there
    let post = postId ? (await Post.promise.findById(postId)) : new Post()
    if (!post) return res.send(404, 'Not Found')
    // get the first file
    let [{title: [title], content: [content]},{image: [file]}] = await new multiparty.Form().promise.parse(req)
    post.title = title
    post.content = content
    post.image.data = await fs.promise.readFile(file.path)
    post.image.contentType = file.headers['content-type']

    // handle the empty fields case
    try {
      await post.save()  
    } catch(e) {
      req.flash('error', 'Post Something!')
      res.redirect('/post')
      return
    }
    
    res.redirect('/blog/' + encodeURI(req.user.blogTitle))
  }))
}
