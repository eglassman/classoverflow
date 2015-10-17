//PRIVATE COLLECTIONS ONLY ON SERVER
Log = new Mongo.Collection("log");
//SiteUsers = new Mongo.Collection("siteusers");

//COLLECTIONS TO BE PUBLISHED TO CLIENT
Classes = new Meteor.Collection('classes');
Errors = new Mongo.Collection("errors");
Hints = new Mongo.Collection("hints");

//COLLECTIONS actually published to client
Meteor.publish("classes", function () {
    return Classes.find();
});
Meteor.publish("errors", function () {
    return Errors.find();
});
Meteor.publish("hints", function () {
    return Hints.find();
});

var edxpass = '071a0f58e44494a90dbc5844c480586c';

requested = function(errorId) {
    var requestedErrors = Meteor.user().profile['requestedErrors'];
    console.log('requestedErrors',requestedErrors)
    console.log('errorId',errorId)
    if (requestedErrors.indexOf(errorId) >= 0) {
        return true;
    } else {
        return false;
    }
    
};
upvoted = function(hintId) {
    var upvotedHints = Meteor.user().profile['upvotedHints'];
    console.log('upvotedHints',upvotedHints)
    console.log('hintId',hintId)
    if (upvotedHints.indexOf(hintId) >= 0) {
        return true;
    } else {
        return false;
    }
    
};




Meteor.methods({

    addError: function(theclass,errorCoords) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        }

        //todo: check if values are right type, within range, appropriate size #sanitization

        //console.log('errorCoords',errorCoords)
        Object.keys(errorCoords).forEach(function(key, index) {
            console.log(key, value);
            var value = errorCoords[key];

            //todo: check if its supposed to be an int or a string!

            if(typeof value === "string" && value.length > 50) {
               //it's a string but its too long
               throw new Meteor.Error('string-too-long'); 
               //todo: tell the user why its not getting added
            }
            if(typeof value === "int" && value.length > 4) {
               //it's a number but its too large or too many decimal places
               throw new Meteor.Error('int-too-big'); 
               //todo: tell the user why its not getting added
            }
        });

        var candidateError = errorCoords; //{};

        candidateError['class'] = theclass;
        candidateError['requests'] = 0;
        candidateError['createdAt'] = new Date();
        candidateError['owner'] = Meteor.userId(); // _id of logged in user
        //candidateError['requesters'] = [];

        Errors.insert(candidateError);
    },
    addHint: function (theclass,errorId,hintText) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        }

        //todo: check if text is right type, appropriate size #sanitization
        if (typeof hintText !== 'string') {
            throw new Meteor.Error('hint-is-no-string')
        }
        if (typeof hintText === 'string' && hintText.length > 1000) {
            throw new Meteor.Error('string-too-long'); 
               //todo: tell the user why its not getting added
        }

        var hintObj = {};
        hintObj['hint'] = hintText;
        hintObj['errorId'] = errorId;
        hintObj['createdAt'] = new Date();
        hintObj['owner'] = Meteor.userId();
        //hintObj['username'] = Meteor.user().username;
        hintObj['class'] = theclass;
        hintObj['upvotes'] = 0;
        //hintObj['upvoters'] = [];


        var insertedHint = Hints.insert(hintObj);

        logObj = {};
        logObj['owner'] = hintObj['owner'];
        //logObj['username'] = Meteor.user().username;
        logObj['action'] = 'add';
        logObj['object'] = insertedHint;
        logObj['createdAt'] = hintObj['createdAt']
        logObj['class'] = hintObj['class'];
        Log.insert(logObj);

    },
    toggleRequest: function (theclass,errorId) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); //I think this is already handled on the client side? redundant there? or here?
        }
        else {

            var delta = 0;
            //var siteUser = user.user; //SiteUsers.findOne({ userId: Meteor.userId() });
            var requestedErrors = Meteor.user().profile['requestedErrors'];

            logObj = {};

            if (!requested(errorId)) {
                console.log('request this error:',errorId)
                delta = 1;
                logObj['action'] = 'request';
                //Meteor.user().profile['requestedErrors'].push(errorId);
                var updated_requestedErrors = requestedErrors.concat(errorId);
                //console.log()
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.requestedErrors": updated_requestedErrors }} );
                console.log('new user profile',Meteor.user().profile)
            } else {
                console.log('unrequest this error:',errorId)
                delta = -1;
                logObj['action'] = 'unrequest';
                //Meteor.user().profile['requestedErrors'] = _.without(requestedErrors,errorId);
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.requestedErrors": _.without(requestedErrors,errorId) }} );
                console.log('new user profile',Meteor.user().profile)
            }
            Errors.update({ _id: errorId },{$inc: {requests: delta}});

            logObj['owner'] = Meteor.userId();
            //logObj['username'] = Meteor.user().username;
            logObj['object'] = errorId;
            logObj['createdAt'] = new Date();
            logObj['class'] = theclass;
            Log.insert(logObj);
        }

    },
    toggleUpvote: function (theclass,hintId) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        }
        else {

            var delta = 0;
            var upvotedHints = Meteor.user().profile['upvotedHints'];
            console.log('upvotedHints', upvotedHints)
            //console.log('Meteor.user()',Meteor.user());
            //var siteUser = user.user; //SiteUsers.findOne({ userId: Meteor.userId() });
            

            logObj = {};

            if (!upvoted(hintId)) {
                console.log('upvote this hint:',hintId)
                delta = 1;
                logObj['action'] = 'upvote';
                //Meteor.user().profile['upvotedHints'].push(hintId);
                var updated_upvotedHints = upvotedHints.concat(hintId);
                console.log('upvotedHints update', updated_upvotedHints)
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.upvotedHints": updated_upvotedHints }} );
                console.log('new user profile',Meteor.user().profile)
            } else {
                console.log('downvote this hint:',hintId)
                delta = -1;
                logObj['action'] = 'downvote';
                //Meteor.user().profile['upvotedHints'] = _.without(upvotedHints,hintId);
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.upvotedHints": _.without(upvotedHints,hintId) }} );
                
                console.log('new user profile',Meteor.user().profile)
            }
            Hints.update({ _id: hintId },{$inc: {upvotes: delta}});


            logObj['owner'] = Meteor.userId();
            //logObj['username'] = Meteor.user().username;
            logObj['object'] = hintId;
            logObj['createdAt'] = new Date();
            logObj['class'] = theclass;
            Log.insert(logObj);
        }
    },
    'loginAsEdxStudent': function(edxstudentID) {
        var edxUserName = 'edx'+edxstudentID;
        var user = Accounts.findUserByUsername(edxUserName);
        if (!user) {
            Accounts.createUser({username: edxUserName,password:edxpass,profile:{
                'isEdxUser':true
            }});
        }
        return {username: edxUserName, password:edxpass}
    }
});

Accounts.onLogin(function(user){
    console.log('logged in',user.user._id )
    Log.insert({'userId': user.user._id, 'loggedInAt': new Date()})
});

/*Accounts.onLoginFailure(function(){
    //console.log(Meteor.userId())
    Log.insert({'loggedInFailedAt': new Date()})
});*/

Accounts.onCreateUser(function(options, user) {
    console.log('creating user')
    
    if (options.profile) {
        user.profile = options.profile;
    } else {
        user.profile = {};
    }

    user.profile.upvotedHints = []; 
    user.profile.requestedErrors = [];

    console.log('user',user);

    return user;
});

Meteor.startup(function () {
        console.log(Meteor.users.find({}).fetch())
        // code to run on server at startup
        //if (! Classes.findOne()){
        Classes.remove({});
        var classes = [
            {
                classtitle: '6.004',
                errorCoords: [
                    {
                        name: "lab",
                        placeholder: 'Lab Number',
                        inputType: 'int'
                    },
                    {
                        name: "module",
                        placeholder: 'Module',
                        inputType: 'string'
                    },
                    {
                        name: "testNum",
                        placeholder: 'Test Number',
                        inputType: 'int'
                    }
    ],
                route: '/class/6.004'
            },
            {
                classtitle: '6.005',
                errorCoords: [
                    {
                        name: "ps",
                        placeholder: "Problem Set",
                        inputType: 'int'
                    },
                    {
                        name: "file",
                        placeholder: 'File Name',
                        inputType: 'string'
                    },
                    {
                        name: "line",
                        placeholder: 'Line Number',
                        inputType: 'int'
                    }
    ],
                route: '/class/6.005'
            }
           ];
        classes.forEach(function (c) {
                Classes.insert(c);
            })
            //}
    });