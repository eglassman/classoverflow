Classes = new Meteor.Collection('classes');
Errors = new Mongo.Collection("errors", {
    transform: function(errorEntry) {
        dtypes = Session.get("coord_dtypes");
        currentSearch = Session.get("currentSearch");
        _.each(dtypes, function(value, key, obj) {
            coordValue = convert_to_dtype(errorEntry[key], "string");
            if (currentSearch[key]) {
                searchregex = new RegExp("("+currentSearch[key]+")", "i");
                errorEntry[key] = coordValue.replace(searchregex, "<b>$1</b>");
            }
        });
        return errorEntry;
    }
});
Hints = new Mongo.Collection("hints");

Meteor.subscribe("classes");
Meteor.subscribe("errors");
Meteor.subscribe("hints");


myScrollIntoView = function(result) {
    $('tr').removeClass('highlighted');
    $('#'+result).addClass('highlighted');
    var offset = $('#'+result).offset();
    $('html, body').animate({
        scrollTop: offset.top - 100
    },1000);    
}

loginAsEdxStudent = function(edxstudentID) {
    Meteor.call('loginAsEdxStudent',edxstudentID, function(error,result){
        if (error) {
            console.log('error on login as edx student',error);
        } else {
            Meteor.loginWithPassword(result.username,result.password,function(error){
                if (error) {
                    console.log('error logging in with password',error);
                }
            });
        }

    });
}

function convert_to_dtype(val, dtype) {
    if (dtype=="int") {
        integer = parseInt(val);
        string = String(integer);
        if (string!=val) {
            return NaN;
        }
        return integer;
        // This may not be a comprehensive check
    }
    else if (dtype=="string") {
        return String(val);
    }
    else {
        console.log("No data type change.");
        return val;
    }
}

function sanitizeCurrentSearch(currentSearch) {
    coord_dtypes = Session.get("coord_dtypes");
    for (var q in currentSearch) {
        if (currentSearch.hasOwnProperty(q)) {
            val = convert_to_dtype(currentSearch[q], "string");
            val = val.replace(/[^a-zA-Z0-9._ -]+/g, "");
            if (typeof(coord_dtypes[q])=="undefined" || !val) {
                delete currentSearch[q];
            }
            else {
                currentSearch[q] = val;
            }
        }
    }
    Session.set('currentSearch',currentSearch);
    Router.go(
        'route.currentclass',
        {"classtitle": Session.get('class')},
        {query: currentSearch, replaceState: true}
    );
}

function getProperSearch() {
    currentSearch = Session.get("currentSearch");
    coord_dtypes = Session.get("coord_dtypes");
    properSearch = _.object(_.map(currentSearch, function(val, key) {
        return [key, convert_to_dtype(val, coord_dtypes[key])];
    }));
    return properSearch;
}

Router.map(function () {
    this.route('about'); // By default, path = '/about', template = 'about'
    this.route('/', {
        name: 'route.home',
        action: function () {
            delete Session.keys['class'];
            this.render('classes');
        }
    });
    this.route('/class/:classtitle', { 
        subscriptions: function() {            
            return [Meteor.subscribe('classes'), 
                    Meteor.subscribe('errors')];
        },
        action: function () {
            if (this.ready()) {

                var theclass = Classes.findOne({
                    classtitle: this.params.classtitle
                })
                var coord_dtypes = {};
                for (var i=0; i<theclass.errorCoords.length; i=i+1) {
                    coords = theclass.errorCoords[i];
                    coord_dtypes[coords["name"]] = coords["inputType"];
                }
                Session.set('coord_dtypes', coord_dtypes);
                Session.set('class', this.params.classtitle);
                Session.set('errorMessage',"");


                if (_.isEmpty(this.params.query)) {
                    if (typeof(Session.get("currentSearch"))=="undefined") {
                        Session.set("currentSearch",{});
                    }
                }
                else {
                    sanitizeCurrentSearch(this.params.query);
                    // properSearch = getProperSearch();
                    // if (Errors.find(properSearch).count()==0) {
                    //     if(_.size(properSearch) == _.size(Session.get("coord_dtypes"))) {
                    //         //$("#find-add-error-btn").click();
                    //         //console.log($("#mySubmissionModal"))
                    //         // Is it because the HTML hasn't loaded yet?
                    //     }
                    // }
                }

                if (!Meteor.user() && this.params.query.student_id) {
                    loginAsEdxStudent(this.params.query.student_id);
                }
                this.render('classpage', {
                    data: this
                }); 
            }
            else {
                console.log("loading");
            }
        }, 
        name: "route.currentclass"
    });        
});

Meteor.startup(function () {
    //Deploy edX version without settings.json
    if (Meteor.settings.public.CertAuthURL) {
        CertAuth.login();
        Session.set('certAuthEnabled',true);
    }
  
}); 

if (Meteor.isClient) {
    Accounts.ui.config({
        passwordSignupFields: 'EMAIL_ONLY', //"USERNAME_ONLY" restrictCreationByEmailDomain: 'school.edu',
        forceEmailLowercase: true
    });
    
    Template.registerHelper('errorCoords',function(){
        var title = Session.get('class');
        if (title) {
            var thisclass = Classes.findOne({classtitle: title})['errorCoords'];
            // for (i=0; i<thisclass.length; i++) {
            //     name = thisclass[i]["name"];
            //     thisclass[i]["currentVal"]=Session.get("currentSearch")[name];
            // }
            // Not a very Meteor-ic way to do things
            return thisclass;
        } else {
            console.log('No title supplied');
        }
    });
    Template.registerHelper('errorCoordsForAnError',function(){
        // Why is this a global helper?
        // Also not very Meteor-ic
        var curError = this;
        var title = Session.get('class');
        var coordVals = [];
        if (title) {
            var thisclass = Classes.findOne({
                classtitle: title
            });
            thisclass['errorCoords'].forEach(function(ec){
                // Kind of an ugly way to achieve this
                errorcoord = ec['name'];
                coordvalue = curError[errorcoord];
                coordVals.push({val: coordvalue});
            });            
            return coordVals;
        } else {
            console.log('No title supplied');
        }
    });
    Template.registerHelper('certAuthEnabled',function(){
        return Session.get('certAuthEnabled');
    });
    
    // classes!
    Template.classes.helpers({
        classes: function () {
            return Classes.find().fetch();
        }
    });
    Template.errorTable.helpers({
        errors: function () {
            var title = Session.get('class');
            var coordsSortObj = {}
            var thisclass = Classes.findOne({
                classtitle: title
            });
            
            thisclass['errorCoords'].forEach(function(ec){
                //console.log(ec);
                coordsSortObj[ec['name']] = 1;
            });
            //console.log(coordsSortObj)
            var sort_obj = {sort: coordsSortObj};
            currentSearch = Session.get("currentSearch");
            search_query = {};
            for (var inputfield in currentSearch) {
                if (currentSearch.hasOwnProperty(inputfield)) {
                    inputvalue = currentSearch[inputfield];
                    if (inputvalue) {
                        dtype = Session.get("coord_dtypes")[inputfield];
                        inputvalue = convert_to_dtype(inputvalue, dtype);
                        if (dtype=="string") {
                            var newregex = new RegExp(inputvalue,"i");
                            // Search string for inputvalue, case insensitive
                            search_query[inputfield] = {"$regex": newregex};
                        }
                        else {
                            search_query[inputfield] = inputvalue;
                        }
                    }
                }
            }
            search_query["class"] = Session.get('class');
            search_results = Errors.find(search_query, sort_obj);
            if (search_results.count()==0) {
                Session.set("errorMessage", "No results found; displaying all results");
                return Errors.find({"class": Session.get('class')}, sort_obj);
            }
            else {
                Session.set("errorMessage", "");
                return search_results;
            }
        }
    });
    Template.error.helpers({
        hintsHelper: function () {
            return Hints.find({errorId:this._id}, {sort: {upvotes: -1, _id: 1}}).fetch();
        },
        ifRequested: function () {
            var errorId = this._id;
            if (Meteor.user() && Meteor.user().profile['requestedErrors'].indexOf(errorId) >= 0) {
                return true
            } else {
                return false
            }
        }
    });
    Template.error.events({
        "submit .new-hint-entry": function(event) {
            console.log(event)
            var hintText = event.target[0].value;
            var errorId = this._id;
            
            event.preventDefault();
            
            if ( $.trim( hintText ) == '' ) { // Check that it's not all whitespace
                return false;
            } else {

                if (Meteor.userId()) {

                    Meteor.call('addHint',Session.get('class'),errorId,hintText,function(error,result){
                        if (error) {
                            console.log('error in Meteor.addHint call',error) //log failure to add hint
                        } else {
                            event.target[0].value = ''; //clear the hint field on success
                        }
                        
                    });

                } else {
                    //alert('Please sign in so you can add this hint.'); 
                    $('#mySignInModal').modal('show');
                }
            }
            return false;
        },
        "click .request": function (event) {

            if (Meteor.userId()) {
                Meteor.call('toggleRequest', Session.get('class'), this._id);
            } else {
                //alert('Please sign in so you can request hints for this error.');
                $('#mySignInModal').modal('show');
            }
            return false;
        }
    });
    Template.hint.helpers({
        ifUpvoted: function () {
            var hintId = this._id;
            if (Meteor.user() && Meteor.user().profile['upvotedHints'].indexOf(hintId) >= 0) {
                return true
            } else {
                return false
            }
        }
    });
    Template.hint.events({
        "click .upvote": function(event){

            if (Meteor.userId()) {

                var hintId = this._id;
                Meteor.call('toggleUpvote',Session.get('class'),hintId);

            } else {
                //alert('Please sign in so you can upvote this hint.');
                $('#mySignInModal').modal('show');
            }
            return false;
        }
    });
    
    /*Template.errorCoord.onRendered(function () {
        console.log('error rendered (what does this mean?)')
        Session.set('errorCoordsRendered',1+Session.get('errorCoordsRendered'));
        if (Session.get('submitQ') && Session.get('errorCoordsRendered')==Session.get('numErrorCoords')) {
            console.log('submit the sucker!')
            $('#find-add-error-btn').click();
            Session.set('submitQ',false)
        }
    });*/

    Template.errorCoord.helpers({
        getCurrentErrorCoord: function() {
            currentSearch = Session.get("currentSearch");
            currentValue = currentSearch[this.name];
            return currentValue;
        }
    });


    // BUGBUGBUG
    Template.errorCoord.events({
        // todo: this is the wrong selector to use; form-control is a bootstrap thing
        // todo: function below should be _.throttle'd
        "keyup .searchBarInput": function(e) {
            var inputname = e.target.name;
            var inputval = e.target.value;
            currentSearch = Session.get('currentSearch');
            currentSearch[inputname] = convert_to_dtype(inputval, "string");

            sanitizeCurrentSearch(currentSearch);
        },
        // ugly implementation: function above is copy-pasted
        "blur .searchBarInput": function(e) {
            var inputname = e.target.name;
            var inputval = e.target.value;
            currentSearch = Session.get('currentSearch');
            currentSearch[inputname] = convert_to_dtype(inputval, "string");

            sanitizeCurrentSearch(currentSearch);
        }
    });

    Template.searchBar.helpers({
        errorCoords: function() {
            var title = Session.get('class');
            if (title) {
                var thisclass = Classes.findOne({
                    classtitle: title
                });
                return thisclass['errorCoords'];
            } else {
                console.log('No title supplied');
            }
        },
        ifAllCoordsExist: function() {
            return _.size(Session.get("currentSearch"))==_.size(Session.get("coord_dtypes"))
        }
    });

    Template.navbar.helpers({
        ifErrorMessage: function() {
            message = Session.get("errorMessage");
            if (!message) {
                return false;
            }
            return true;
        }
    });
    
    Template.navbar.events({
        "submit .errorCoords-form": function (event) {
            event.preventDefault();
            if (!Meteor.userId()) {
                $('#mySignInModal').modal('show');
            } else {
                $("#mySubmissionModal").modal("show");
            }
            return false;
        },
        "click .feedback": function (event) {
            console.log('feedback clicked')
        },
        "click .instructions": function (event) {
            console.log('instructions clicked')
        }
    });
    
    Template.submission_modal.events({
        "click #addErrorButton": function(event) {
            // Assumes that user isn't changing Session(currentSearch)
            properSearch = getProperSearch();
            Meteor.call('addError',
                Session.get("class"),
                properSearch,
                function(error,result){
                    if (error) {
                        console.log('error during addError', error)
                    } else {
                        //myScrollIntoView(result);
                        sanitizeCurrentSearch(Session.get("currentSearch"));
                    }
            });
            $("#mySubmissionModal").modal("hide");
        },
        "click #addErrorCancel": function(event) {
            $("#mySubmissionModal").modal("hide");
        }
    });

    Template.errorMessageBar.helpers({
        getErrorMessage: function() {
            message = Session.get("errorMessage");
            if (typeof(message)=="undefined") {
                return "Not defined";
            }
            return message;
        }
    });

    Template.submission_modal.helpers({
        getCurrentSearch: function(errorCoord) {
            return Session.get("currentSearch")[errorCoord];
        },
        ifErrorCoordsValid: function() {
            coord_dtypes = Session.get("coord_dtypes");
            properSearch = getProperSearch();

            if (_.size(properSearch) != _.size(coord_dtypes)) {
                return "Please provide a value for all form values";
            }
            else if (Errors.find(properSearch).count()!=0) {
                return "The error already exists.";
                // todo: You need to convert currentSearch to the appropriate data-type before searching
            }
            return false;
        }
    });
}