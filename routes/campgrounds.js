var express= require("express");
var router= express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");
var NodeGeocoder = require('node-geocoder');
var options = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null
};
var geocoder = NodeGeocoder(options);
var multer = require('multer');
var storage = multer.diskStorage({
    filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
    cloud_name: "dvc6jv4k2", 
    api_key: "723576487231428", 
    api_secret: "EQGWGRmoT5N5tldwm6yjVIFBjXw"
});

//INDEX
router.get("/",function(req,res){
    Campground.find({},function(err, allCampgrounds){
        if(err){
            console.log(err);
        }
        else{
            res.render("campgrounds/index",{campgrounds:allCampgrounds, page:"campgrounds"});
        }
    });
});

//NEW
router.get("/new",middleware.isLoggedIn,function(req,res){
    res.render("campgrounds/new");
});

//SHOW
router.get("/:id",function(req,res){
    Campground.findById(req.params.id).populate("comments").exec(function(err,foundCampground){
        if(err || !foundCampground){
            req.flash("error", "Campground not found!");
            res.redirect("back");
        } else{
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

//EDIT
router.get("/:id/edit",middleware.checkCampgroundOwnership,function(req,res){
    Campground.findById(req.params.id, function(err,campgroundToEdit){
        if(err){
            console.log(err);
        }else{
            res.render("campgrounds/edit",{campground:campgroundToEdit}); 
        }
    });
});

//UPDATE
router.put("/:id",middleware.checkCampgroundOwnership, function(req,res){
   geocoder.geocode(req.body.location,function(err,data){
        if(err || !data.length){
            req.flash("error","Invalid Address");
            return res.redirect("back");
        }
        var lat = data[0].latitude;
        var lng = data[0].longitude;
        var location = data[0].formattedAddress;
        var newData = {name: req.body.name, image: req.body.image, description: req.body.description, location: location, lat: lat, lng: lng};
        Campground.findByIdAndUpdate(req.params.id,newData,function(err,campground){
               if(err){
                   req.flash("error",err.message);
                   res.redirect("back");
               } else{
                   req.flash("success","Successfully updated.");
                   res.redirect("/campgrounds/"+campground._id);
               }
        });
    });
});

//CREATE
router.post("/",middleware.isLoggedIn,upload.single('image'),function(req,res){
    geocoder.geocode(req.body.campground.location,function(err,data){
        if(err || !data.length){
            req.flash("error","Invalid Address");
            return res.redirect("back");
        }
        cloudinary.uploader.upload(req.file.path, function(result) {
            req.body.campground.image = result.secure_url;
            req.body.campground.author = {
                id: req.user._id,
                username: req.user.username
            }
            req.body.campground.lat = data[0].latitude;
            req.body.campground.lng = data[0].longitude;
            req.body.campground.location = data[0].formattedAddress;
            Campground.create(req.body.campground, function(err, campground) {
                if (err) {
                  req.flash('error', err.message);
                  return res.redirect('back');
                }
                res.redirect('/campgrounds/' + campground.id);
            });
        });
    });
});

//DESTROY
router.delete("/:id",middleware.checkCampgroundOwnership, function(req,res){
    Campground.findByIdAndRemove(req.params.id,function(err){
        if(err){
            console.log(err);
            res.redirect("/campgrounds");
        }else{
            req.flash("success","Successfully deleted campground.");
            res.redirect("/campgrounds");
        }
    });
});


module.exports = router;