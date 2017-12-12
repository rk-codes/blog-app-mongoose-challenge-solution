	const chai = require('chai');
	const chaiHttp = require('chai-http');
	const faker = require('faker');
	const mongoose = require('mongoose');

	const should = chai.should();

	const { BlogPost } = require('../models');
	const {app, runServer, closeServer} = require('../server');
	const {TEST_DATABASE_URL} = require('../config');

	chai.use(chaiHttp);

	function seedBlogPostData() {
	  console.info('seeding blog post data');
	  const seedData = [];
	  for (let i = 1; i <= 10; i++) {
	    seedData.push({
	      author: {
	        firstName: faker.name.firstName(),
	        lastName: faker.name.lastName()
	      },
	      title: faker.lorem.sentence(),
	      content: faker.lorem.text()
	    });
	  }
	  // this will return a promise
	  return BlogPost.insertMany(seedData);
	}

	function tearDownDb() {
	  return new Promise((resolve, reject) => {
	    console.warn('Deleting database');
	    mongoose.connection.dropDatabase()
	      .then(result => resolve(result))
	      .catch(err => reject(err));
	  });
	}

	describe('blog posts API resource', function () {

	  before(function () {
	    return runServer(TEST_DATABASE_URL);
	  });

	  beforeEach(function () {
	    return seedBlogPostData();
	  });

	  afterEach(function () {
	    // tear down database so we ensure no state from this test
	    // effects any coming after.
	    return tearDownDb();
	  });

	  after(function () {
	    return closeServer();
	  });

	  describe('GET endpoint', function() {
			it('should return all existing blog posts', function() {
				let res;
				return chai.request(app)
				 .get('/posts')
				 .then(function(_res) {
				 	res = _res;
				 	res.should.have.status(200);
				 	res.body.length.should.be.at.least(1);
				 	return BlogPost.count();
				 })
				 .then(function(count) {
				 	return res.body.length.should.be.equal(count); 
				 	
				 });

			});
			it('should return blog post with right fields', function() {
				let resBlogPost;
				return chai.request(app)
				.get('/posts')
				.then(function(res) {
					res.should.have.status(200);
					res.should.be.json;
					res.body.should.be.a('array');
					res.body.should.have.length.of.at.least(1);
					res.body.forEach(function(post) {
						post.should.be.a('object');
						post.should.include.keys('title', 'content', 'author');
					});
					resBlogPost = res.body[0];
					return BlogPost.findById(resBlogPost.id);
				})
				.then(function(blogPost) {
					resBlogPost.id.should.equal(blogPost.id);
					resBlogPost.title.should.equal(blogPost.title);
					resBlogPost.content.should.equal(blogPost.content);
					return resBlogPost.author.should.equal(blogPost.authorName);
					
				});
			});
		});

	 describe('POST endpoint', function() {
			it('should add a new blog post', function() {
				let newBlogPost = {
					title: faker.lorem.sentence(),
	    			content: faker.lorem.paragraph(),
	    			author: {
	    				firstName: faker.name.firstName(),
	    				lastName: faker.name.lastName()
	    			}
				};
				return chai.request(app)
				.post('/posts')
				.send(newBlogPost)
				.then(function(res) {
					res.should.have.status(201);
					res.should.be.json;
					res.body.should.be.a('object');
					res.body.should.include.keys('title', 'content', 'author');
					res.body.id.should.not.be.null;
					return BlogPost.findById(res.body.id);
				})
				.then(function(post) {
					post.title.should.equal(newBlogPost.title);
					post.content.should.equal(newBlogPost.content);
					post.author.firstName.should.equal(newBlogPost.author.firstName);
					post.author.lastName.should.equal(newBlogPost.author.lastName);
				});
			});

		});
	 describe('PUT endpoint', function() {
			it('should update a blog post by id', function() {
				const updateData = {
					title: 'New Title',
					content: 'New content'
				};
				return BlogPost.findOne()
				.then(function(post) {
					updateData.id = post.id;
					return chai.request(app)
					.put(`/posts/${post.id}`)
					.send(updateData)
				})
				.then(function(res) {
					res.should.have.status(204);
					return BlogPost.findById(updateData.id);
				})
				.then(function(post) {
					post.title.should.equal(updateData.title);
					post.content.should.equal(updateData.content);
				});
			});
		});

	 describe('DELETE endpoint', function() {
			it('should delete a blog post by id', function() {
				let blogPost;
				BlogPost
				.findOne()
				.then(function(post) {
					blogPost = post;
					return chai.request(app)
					.delete(`/posts/${blogPost.id}`);
				})
				.then(function(res) {
					res.should.have.status(204);
					return BlogPost.findById(blogPost.id);
				})
				.then(function(post) {
					should.not.exist(post);
				});
			});
		});

	});
