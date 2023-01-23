const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const crypto = require('crypto')
const mongoose = require('mongoose')
const multer = require('multer')
const {GridFsStorage} = require('multer-gridfs-storage')
const Grid = require('gridfs-stream')
const methodOverride = require('method-override')
const { response } = require('express')

const app = express()

//mongdb uri
const mongoURI = "mongodb://localHost:27017/upload"

//create mongo connection
const conn = mongoose.createConnection(mongoURI)

app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

//init gfs
let gfs, gridfsBucket;
conn.once('open', () => {
    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
    })
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads')
})

//create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });


app.get('/', (req, res) => res.render('index'));

//@ route POST /upload
//@desc Uploads file to db

app.post('/upload', upload.single('file'), (req, res) => {
    res.redirect('/')
    // res.json({file: req.file})
})

//@route GET files
//@display all files in JSON
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        //check if files 
        if (!files || files.length === 0){
            return res.status(404).json({
                err: 'NO files exist'
            });
        }
        return res.json(files);
    })
})

//@route GET /files/:filename
//@display all files in JSON
app.get('/file/:filename', (req, res) => {
    gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        //check if files 
        if (!file || file.length === 0){
            return res.status(404).json({
                err: 'NO file exist'
            });
        }
        // file exists
        return res.json(file);
    })
})

//@route GET /image/:filename
//@desc Display Image
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        //check if files 
        if (!file || file.length === 0){
            return res.status(404).json({
                err: 'NO file exist'
            });
        }

        // file exists
        if(file.contentType === "image/jpeg" || file.contentType === "img/png"){
            //read output to browser
            const readstream = gridfsBucket.openDownloadStream(file._id)
            readstream.pipe(res)
        } else {
            res.status(404).json({
                err: 'Not an image'
            })
        }
    })
})

const port = 3000
app.listen(port, () => console.log(`app listening on port ${port}!`))