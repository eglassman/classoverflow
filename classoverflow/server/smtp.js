//based on http://lukaszkups.net/blog/0005_sending_emails_with_meteor/


Meteor.methods({
  sendEmail: function (studentEmail,error_description,errorLink){ //,hint) {
  	console.log('checking strings')
    check(error_description, String);
    //check(hint, String);
    check(errorLink, String);

    this.unblock();

    console.log('calling email send!')
    Email.send({
      to: studentEmail,
      bcc: 'elena.glassman@gmail.com',
      from: 'class.overflow.beta@gmail.com',
      subject: 'New hints for resolving an error at '+error_description,
      text: 'Visit '+ errorLink +' to see new hints available for revolving an error at '+error_description+'.'
    });
  }
});