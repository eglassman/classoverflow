Log = new Mongo.Collection("log");
Classes = new Meteor.Collection('classes');
Errors = new Mongo.Collection("errors");
Hints = new Mongo.Collection("hints");
//SiteUsers = new Mongo.Collection("siteusers");
Feedback = new Mongo.Collection("feedback");

requested = function(theclass,errorId,userId) {
	console.log('this is a placeholder'); //#todo--make this actually check
	return true
};

Meteor.methods({

	addHint: function (theclass,errorId,hintText) {

		if (! Meteor.userId() ) {
			throw new Meteor.Error('not-authorized'); //I think this is already handled on the client side? redundant there? or here?
		}
		var hintObj = {};
        hintObj['hint'] = hintText;
        hintObj['errorId'] = errorId;
        hintObj['createdAt'] = new Date();
        hintObj['owner'] = Meteor.userId();
        //hintObj['username'] = Meteor.user().username;
        hintObj['class'] = theclass;
        hintObj['upvotes'] = 0;


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
			logObj = {};

			if (requested(theclass,errorId,Meteor.userId())) {
				delta = 1;
				logObj['action'] = 'request';
			} else {
				delta = -1;
				logObj['action'] = 'unrequest';
			}
			Errors.update({ _id: errorId },{$inc: {requests: delta}});

	        logObj['owner'] = Meteor.userId();
	        //logObj['username'] = Meteor.user().username;
	        logObj['object'] = errorId;
	        logObj['createdAt'] = new Date();
	        logObj['class'] = theclass;
	        Log.insert(logObj);
    	}

	}

});

Accounts.onLogin(function(user){
    //console.log(Meteor.userId())
    console.log('logged in',user.user._id )
    Log.insert({'userId': user.user._id, 'loggedInAt': new Date()})
    //SiteUsers.insert({'email': Meteor.user().emails[0], 'userId': Meteor.userId(), 'loggedInAt': new Date()})
});

Accounts.onLoginFailure(function(){
    //console.log(Meteor.userId())
    Log.insert({'loggedInFailedAt': new Date()})
});

Meteor.startup(function () {
        // code to run on server at startup
        //if (! Classes.findOne()){
        Classes.remove({});
        var classes = [
            {
                classtitle: '6.004',
                errorCoords: [
                    {
                        name: "lab",
                        placeholder: 'Lab Number'
                    },
                    {
                        name: "module",
                        placeholder: 'Module'
                    },
                    {
                        name: "testNum",
                        placeholder: 'Test Number'
                    }
    ],
                route: '/class/6.004'
            },
            {
                classtitle: '6.005',
                errorCoords: [
                    {
                        name: "ps",
                        placeholder: "Problem Set" 
                    },
                    {
                        name: "file",
                        placeholder: 'File Name'
                    },
                    {
                        name: "line",
                        placeholder: 'Line Number'
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