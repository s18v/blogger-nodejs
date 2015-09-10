let then = require('express-then')
let multiparty = require('multiparty')
let isLoggedIn = require('./middleware/isLoggedIn')
let Post = require('./models/post')
let fs = require('fs')
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

  app.get('/post/:postId?', then(async (req, res) => {
    let postId = req.params.postId
    if (!postId) {
      res.render('post.ejs', {
        post: {},
        verb: 'Create',
        message: req.flash('error')
      })
      return
    }
    

    //TODO - Resolve CastError Issue
    let post = await Post.promise.findById(postId)
    if (!post) res.send(404, 'Not Found')

    let dataUri = new DataUri
    let image = dataUri.format('.' + post.image.contentType.split('/').pop(), post.image.data)
    console.log(image)
    res.render('post.ejs', {
      post: post,
      verb: 'Edit',
      image: `data:${post.image.contentType};base64,${image.base64}`,
      message: req.flash('error')
    })



  }))

  app.post('/post/:postId?', then(async (req, res) => {
    let postId = req.params.postId
    if (!postId) {
      let post = new Post()
      // get the first file
      let [{title: [title], content: [content]},{image: [file]}] = await new multiparty.Form().promise.parse(req)
      
      console.log('title & content - ', title, content)
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
      return
    }
    // find by the id if the blog post is there
    let post = await Post.promise.findById(postId)
    if (!post) res.send(404, 'Not Found')

    post.title = title
    post.content = content

    await post.save()
    res.redirect('/blog/' + encodeURI(req.user.blogTitle))
  }))

  // TODO Implement this
  app.get('/blog/', (req, res) => {
    console.log('Implement blog.ejs')
  })
}
