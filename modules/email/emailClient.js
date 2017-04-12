var handlebars = require('handlebars')
var nodemailer = require('nodemailer')
var wellknown = require('nodemailer-wellknown')


function emailClient() {
    this.config = undefined;

    _self = this;

    return {

        init: function (config) {
            _self.config = config;
        },

        send: function (serviceData, template, cb) {
            var transport = nodemailer.createTransport(_self.config);
            var htmlContent = '';
            var textContent = ''

            if (template.html) {
                var htmlTemplate = handlebars.compile(template.html);
                htmlContent = htmlTemplate(serviceData);
            }

            if (template.text) {
                var textTemplate = handlebars.compile(template.text);
                textContent = textTemplate(serviceData);
            }

            transport.sendMail({
                from: serviceData.from,
                to: serviceData.to,
                subject: serviceData.subject,
                html: htmlContent,
                text: textContent
            }, function (err, responseStatus) {
                if (err) {
                    return console.error(err)
                }

                cb(null, responseStatus);
            })

        }
    }



}


module.exports = emailClient;