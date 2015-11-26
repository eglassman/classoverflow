Classes = new Meteor.Collection('classes');
Errors = new Mongo.Collection("errors");
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
        return parseInt(val);
    }
    else if (dtype=="string") {
        return String(val);
    }
    else {
        console.log("No data type change.");
        return val;
    }
}


Router.map(function () {
    this.route('about'); // By default, path = '/about', template = 'about'
    this.route('/', function () {
        this.render('classes');
    });
    this.route('/class/:classtitle', { 
        subscriptions: function() {            
            return [Meteor.subscribe('classes'), 
                    Meteor.subscribe('errors')];
        },
        action: function () {
            if (this.ready()) {
                console.log("ready!");


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



                if (_.isEmpty(this.params.query)) {
                    if (typeof(Session.get("currentSearch"))=="undefined") {
                        Session.set("currentSearch",{});
                    }
                    console.log("in here");
                }
                else {
                    var queryparams = {};
                    for (var q in this.params.query) {
                        if (this.params.query.hasOwnProperty(q)) {
                            if (typeof(coord_dtypes[q])!="undefined") {
                                val = this.params.query[q];
                                dtype = coord_dtypes[q];
                                queryparams[q] = convert_to_dtype(val,"string")
                            }
                        }
                    }
                    Session.set('currentSearch', queryparams);

                    Session.set('numErrorCoords',theclass['errorCoords'].length);
                    
                    // todo: redirect to main URL

                    //find or login with student id
                    if (!Meteor.user() && this.params.query.student_id) {
                        loginAsEdxStudent(this.params.query.student_id);
                    }
                    // todo: what does submitQ do?
                    Session.set('submitQ', false);
                    Router.go('/class/'+this.params.classtitle);
                }

                this.render('classpage', {
                    data: this
                }); 
            }
            else {
                console.log("loading");
            }
        }
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
            var thisclass = Classes.findOne({
                classtitle: title
            });
            return thisclass['errorCoords'];
        } else {
            console.log('no title supplied');
        }
    });
    Template.registerHelper('errorCoordsForAnError',function(){
        var curError = this;
        var title = Session.get('class');
        var coordVals = [];
        if (title) {
            var thisclass = Classes.findOne({
                classtitle: title
            });
            thisclass['errorCoords'].forEach(function(ec){
                coordVals.push({val: curError[ec['name']]});
            });                
            return coordVals;
        } else {
            console.log('no title supplied');
        }
    });
    Template.registerHelper('certAuthEnabled',function(){
        return Session.get('certAuthEnabled');
    });
    
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
                        dtype = Session.get('coord_dtypes')[inputfield];
                        search_query[inputfield] = convert_to_dtype(inputvalue, dtype);
                    }
                }
            }
            console.log("currentSearch", currentSearch);
            search_query["class"] = Session.get('class');
            return Errors.find(search_query, sort_obj)
        }
    });
    Template.error.helpers({
        hintsHelper: function () {
            return Hints.find({errorId:this._id}, {sort: {upvotes: -1, _id: 1}}).fetch();
        },
        ifRequested: function () {
            var errorId = this._id;
            if (Meteor.user().profile['requestedErrors'].indexOf(errorId) >= 0) {
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
            if (Meteor.user().profile['upvotedHints'].indexOf(hintId) >= 0) {
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
    
    Template.errorCoord.onRendered(function () {
        console.log('error rendered (what does this mean?)')
        Session.set('errorCoordsRendered',1+Session.get('errorCoordsRendered'));
        if (Session.get('submitQ') && Session.get('errorCoordsRendered')==Session.get('numErrorCoords')) {
            console.log('submit the sucker!')
            $('#find-add-error-btn').click();
            Session.set('submitQ',false)
        }
    });

    Template.errorCoord.helpers({
        getCurrentErrorCoord: function() {
            currentSearch = Session.get("currentSearch");
            currentValue = currentSearch[this.name];
            return currentValue;
        }
    });

    Template.errorCoord.events({
        // todo: this is the wrong selector to use; form-control is a bootstrap thing
        "keyup .form-control": _.throttle(function(e) {
            var inputname = e.target.name;
            var inputval = e.target.value;
            currentSearch = Session.get('currentSearch');
            if (!inputval) {
                //delete currentSearch[inputname];
                currentSearch[inputname] = inputval;
            }
            else {
                // Don't need to check for whether inputname is an existing key?
                // dtype = Session.get("coord_dtypes")[inputname];
                currentSearch[inputname] = convert_to_dtype(inputval, "string");
                // TODO: parseInt is hardcoded!
                // todo: is this even the right place to be converting datatypes?
                // todo: make this more elegant
            }
            Session.set('currentSearch',currentSearch);
        }, 200)
    });

    Template.navbar.helpers({
        errorCoords: function() {
            console.log('navbar errorCoords')
            var title = Session.get('class');
            if (title) {
                var thisclass = Classes.findOne({
                    classtitle: title
                });
                var submitQ = true; //just the initialization

                Session.set('errorCoordsRendered',0);
                for (var ec in thisclass['errorCoords']) {
                    var coordval = Session.get(thisclass['errorCoords'][ec]['name']);
                    thisclass['errorCoords'][ec]['coordvalue'] = coordval;
                    if (coordval==undefined) {
                        submitQ = false;
                    }
                }
                Session.set('submitQ',submitQ);
                //console.log('finished errorCoords')
                //console.log(Session.get('submitQ'))
                return thisclass['errorCoords'];
            } else {
                console.log('no title supplied');
            }
        }
    });
    
    Template.navbar.events({
        "submit .errorCoords-form": function (event) {
            event.preventDefault();

            var candidateErrorCoords = {};
            for (i = 0; i < event.target.length-1; i++) { //-1 so that i don't consider the submit button too.

                if (!event.target[i].value) {
                    alert('Please provide a value for all form fields.');
                    break;
                } else {
                    var coordVal = isNaN(parseInt(event.target[i].value)) ? event.target[i].value : parseInt(event.target[i].value);
                    candidateErrorCoords[event.target[i].name] = coordVal;

                }
            }

            console.log('candidateErrorCoords',candidateErrorCoords);
            registeredError = Errors.findOne(candidateErrorCoords);
            console.log('registeredError',registeredError)
            if (!registeredError) {
                console.log(Meteor.user())
                if (Meteor.userId()) {
                    
                    Meteor.call('addError',Session.get('class'),candidateErrorCoords,function(error,result){
                        //console.log(error,result);
                        if (error) {
                            console.log('error during addError', error)
                        } else {
                            myScrollIntoView(result);
                        }
                    });
                    //$('#'+insertedError).css("background-color","gray");
                    //console.log($('#'+insertedError).text())
                    //console.log($('#'+insertedError).css("background-color"))
                } else {
                    //alert('This error is not yet in our system. Please sign in so you can add it.');
                    $('#mySignInModal').modal('show');
                }
            } else {
                myScrollIntoView(registeredError._id); 
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
}