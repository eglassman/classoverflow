
Meteor.methods({
  sendEmail: function (errorString,errorLink,hint) {
    check(errorString, String);
    check(hint, String);
    check(errorLink, String);

    this.unblock();

    Email.send({
      to: 'support@myClientProject.com',
      from: 'class.overflow.beta@gmail.com',
      subject: 'New hints for resolving error '+errorString,
      text: 'Visit www.classoverflow.org to...'+hint+errorString
    });
  }
});