Classes = new Meteor.Collection('classes');
Errors = new Mongo.Collection("errors");
Hints = new Mongo.Collection("hints");

Meteor.startup(function () {

    //Deploy edX version without settings.json
    if (Meteor.settings.public.CertAuthURL) {
        CertAuth.login();
        Session.set('certAuthEnabled',true);
    }
    Meteor.call('sendEmail','elg@mit.edu','a','b','c');
}); 


Accounts.ui.config({
    passwordSignupFields: 'EMAIL_ONLY', //"USERNAME_ONLY" restrictCreationByEmailDomain: 'school.edu',
    forceEmailLowercase: true
});

Template.registerHelper('log',function(){
    console.log('template logging',this);
});

Template.registerHelper('errorCoordsForAnError',function(){
    var curError = this;
    var title = Session.get('class');
    var coordVals = [];
    if (title) {
        var thisclass = Classes.findOne({
            classtitle: title
        });
        var route = '/class/'+encodeURIComponent(title);
        thisclass['errorCoords'].forEach(function(ec,ind){
            var field_name_first = 'coord'+ind.toString()+'first';
            route = route + '/' + encodeURIComponent(curError[ec['name']]);
            coordVals.push({
                val: curError[ec['name']], 
                placeholder: ec['placeholder'], 
                first: curError[field_name_first],
                route: route
            });
        });
        var lastCoord = coordVals[coordVals.length-1];
        lastCoord['last'] = true;
        coordVals[coordVals.length-1] = lastCoord;             
        return coordVals;
    } else {
        console.log('no title supplied');
    }
});
Template.registerHelper('certAuthEnabled',function(){
    return Session.get('certAuthEnabled');
});

Template.registerHelper('islevel',function(level,levelnumber){
    return level==levelnumber
});

Template.mainpage.helpers({
    class_entries: function () {
        return Classes.find().fetch();
    }
});

Template.error_row.helpers({
    hintsHelper: function () {
        return Hints.find({errorId:this._id}, {sort: {upvotes: -1, _id: 1}}).fetch();
    },
    ifRequested: function () {
        var errorId = this._id;
        if (Meteor.user()){
            if (Meteor.user().profile['requestedErrors'].indexOf(errorId) >= 0) {
                return true;
            } 
        }
        return false;
    }
});
Template.addErrorBtn.events({
    "click .add-error": function(event){
        console.log('add-error button clicked',event)

        if (Meteor.userId()){
            $('#addErrorModal').modal('show');
        } else {
            $('#mySignInModal').modal('show');
        }
        return false;
    }
});
Template.addErrorModal.events({
    'click .submit-error': function(event){

        event.preventDefault();

        console.log('event', event)
        console.log('event.target', event.target)

        var candidateErrorCoords = {};

        // console.log('#error-class',$('#error-class').val())
        // var error_class = $('#error-class').val()
        console.log('#error-assignment',$('#error-assignment').val())
        console.log('#error-testgroup',$('#error-testgroup').val())
        console.log('#error-testnum',$('#error-testnum').val())

        // var submit_allowed = False;
        // $('#submit-error').prop('disabled','disabled');

        var title = Session.get('class');
        var thisclass = Classes.findOne({
            classtitle: title
        });
        candidateErrorCoords[thisclass['errorCoords'][0]['name']] = $('#error-assignment').val()
        candidateErrorCoords[thisclass['errorCoords'][1]['name']] = $('#error-testgroup').val()
        candidateErrorCoords[thisclass['errorCoords'][2]['name']] = $('#error-testnum').val()


        // if (Classes.find({classtitle:error_class}).count()>0) {
        //     console.log('class match')
        // } else {
        //     $('#error-testnum').after('<span class="glyphicon glyphicon-remove form-control-feedback"></span>');
        //     $('#submit-error').prop('disabled',true);
        // }
        
        // for (i = 0; i < event.target.length-1; i++) { //-1 so that i don't consider the submit button too.
        //     if (!event.target[i].value) {
        //         //alert('Please provide a value for all form fields.');
        //         return false;
        //     } else {
        //         var coordVal = isNaN(parseInt(event.target[i].value)) ? event.target[i].value : parseInt(event.target[i].value);
        //         candidateErrorCoords[event.target[i].name] = coordVal;
        //     }
        //     console.log(candidateErrorCoords)
        // }

        Meteor.call('addError',Session.get('class'),candidateErrorCoords,function(error,result){
            if (error) {
                console.log('error during addError', error)
            } else {
                console.log('added',candidateErrorCoords)
                $('#addErrorModal').modal('hide');
            }
        });
        return false;
    }
});
Template.addHintModal.events({
    "click .submit-hint": function(event){
        //event.preventDefault();
        console.log('.submit-hint clicked', event)
        console.log('event.target',event.target)
        var errorId = $(event.target).data('error-id');
        var hintText = $('#hint-text-for-'+errorId).val();
        console.log(hintText)

        Meteor.call('addHint',Session.get('class'),errorId,hintText,function(error,result){
            if (error) {
                console.log('error in Meteor.addHint call',error) 
            } else {
                $('#hint-text-for-'+errorId).val('');
                $('#addHintModal-'+errorId).modal('hide');
            }
            
        });

        return false
    }
});
Template.errorTable.events({
    "click .add-hint": function(event){
        if (Meteor.userId()){
            var errorId = $(event.target).data('error-id');
            $('#addHintModal-'+errorId).modal('show');
        } else {
            $('#mySignInModal').modal('show');
        }
        return false;
    },
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
                $('#mySignInModal').modal('show');
            }
        }
        return false;
    },
    "click .request": function (event) {

        if (Meteor.userId()) {
            Meteor.call('toggleRequest', Session.get('class'), this._id);
        } else {
            $('#mySignInModal').modal('show');
        }
        return false;
    }
});
Template.hint.helpers({
    ifUpvoted: function () {
        var hintId = this._id;
        if (Meteor.user()){
            if (Meteor.user().profile['upvotedHints'].indexOf(hintId) >= 0) {
                return true;
            }
        }
        return false;
    }
});
Template.hint.events({
    "click .upvote": function(event){
        if (Meteor.userId()) {
            var hintId = this._id;
            Meteor.call('toggleUpvote',Session.get('class'),hintId);
        } else {
            $('#mySignInModal').modal('show');
        }
        return false;
    }
});

Template.errorCoord.onRendered(function () {
    Session.set('errorCoordsRendered',1+Session.get('errorCoordsRendered'));
    if (Session.get('submitQ') && Session.get('errorCoordsRendered')==Session.get('numErrorCoords')) {
        $('#find-add-error-btn').click();
        Session.set('submitQ',false)
    }
});
Template.navbar.helpers({
    errorCoords: function() {
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
            if (Meteor.userId()) {
                Meteor.call('addError',Session.get('class'),candidateErrorCoords,function(error,result){
                    if (error) {
                        console.log('error during addError', error)
                    } else {
                        myScrollIntoView(result);
                    }
                });
            } else {
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

