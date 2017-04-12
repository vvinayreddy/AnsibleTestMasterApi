var request = require('request');
var util = require('util');
var _ = require('lodash');
var logger = require('log4js').getLogger('RestClient');

function getRequestOptions(reqObj, path, cb) {
    var option = {
        uri: reqObj.baseUrl + path,
        headers: reqObj.headers ? reqObj.headers : {
            'User-Agent': 'rest-client',
            'Content-Type': 'application/json'
        },
        json: true
    };

    if (!cb) {
        return option;
    }

    if (reqObj.authToken) {
        option.headers[reqObj.authHeader] = reqObj.authToken
        return cb(undefined, option);
    } else {
        reqObj.login(reqObj.authJson, function (err, res) {
            if (err) {
                cb(err);
            } else {
                option.headers[reqObj.authHeader] = res.token
                reqObj.authToken = res.token;
                return cb(undefined, option);
            }
        });
    }

};



function RestClient() {
    this.url = undefined;
    this.authToken = undefined;
    this.headers = undefined;
    this.baseUrl = undefined;
    this.authHeader = undefined;
    this.authJson = undefined;
    this.debug = false;
    return {
        init: function (configObject) {
            if (!configObject.url) {
                throw Error("Url Missing");
            }

            if (!configObject.authHeader) {
                throw Error("authHeader Missing");
            }

            this.url = configObject.url;
            this.authHeader = configObject.authHeader;
            this.authToken = configObject.authToken;
            this.headers = configObject.headers;
            this.authJson = configObject.authJson;

            this.debug = configObject.debug ? configObject.debug : false;
            if (this.debug) {
                logger.setLevel('DEBUG');
            }

            //logger.info("RestClient Debug Level", this.debug)

            if (configObject.baseUri)
                this.baseUrl = util.format("%s/%s/", this.url, configObject.baseUri)
            else
                this.baseUrl = util.format("%s/", this.url)


        },
        handleResponse: function (cb, error, response, body) {
            return (error) ? cb(error) : cb(error, body);
        },
        login: function (loginObj, cb) {
            var option = getRequestOptions(this, 'auth/sign-in');
            option.json = loginObj;
            logger.debug('restClient login [headers hidden]:', option.uri);

            request.post(option, this.handleResponse.bind(this, cb));
        },
        get: function (reqObj, queryString, cb) {
            var _this = this;
            var qString = '';
            if (arguments.length === 2) {
                cb = queryString;
            } else {
                qString = queryString ? '?' + queryString : '';
            }
            getRequestOptions(this, reqObj.context + qString, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    res.headers = _.merge(res.headers, reqObj.headers);
                    logger.debug('restClient get:', JSON.stringify(res));
                    request.get(res, _this.handleResponse.bind(this, cb));
                }
            });
        },
        getById: function (reqObj, id, cb) {
            var _this = this;

            getRequestOptions(this, reqObj.context + "/" + id, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    res.headers = _.merge(res.headers, reqObj.headers);
                    logger.debug('restClient getById:', JSON.stringify(res));
                    request.get(res, _this.handleResponse.bind(this, cb));
                }
            });
        },
        getByIdXml: function (reqObj, id, cb) {
            var _this = this;

            if (reqObj.headers)
                reqObj.headers['Content-Type'] = 'application/xml';

            getRequestOptions(this, reqObj.context + "/" + id, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    res.headers = _.merge(res.headers, reqObj.headers);
                    res.json = false;
                    request.get(res, _this.handleResponse.bind(this, cb));
                }
            });
        },
        getByField: function (reqObj, field, value, cb) {
            var _this = this;
            var filter = util.format("$filter=%s eq '%s'", field, value);
            getRequestOptions(this, reqObj.context + '?' + filter, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    res.headers = _.merge(res.headers, reqObj.headers);
                    request.get(res, _this.handleResponse.bind(this, cb));
                }
            });
        },
        getByFields: function (reqObj, fields, cb) {
            var _this = this;
            var filter = "$filter= "
            var and = ' '

            fields.forEach(function (field) {
                filter += util.format("%s %s eq '%s' ", and, field.key, field.value);
                and = ' and'; // after the first filter add and
            });

            getRequestOptions(this, reqObj.context + '?' + filter, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    res.headers = _.merge(res.headers, reqObj.headers);
                    request.get(res, _this.handleResponse.bind(this, cb));
                }
            });
        },
        save: function (reqObj, objectToSave, cb) {
            var _this = this;
            getRequestOptions(this, reqObj.context, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    res.headers = _.merge(res.headers, reqObj.headers);
                    res.json = objectToSave;
                    logger.debug('restClient save:', JSON.stringify(res));
                    request.post(res, _this.handleResponse.bind(this, cb));
                }
            });
        },
        postBody: function (reqObj, objectToSave, cb) {
            var _this = this;
            getRequestOptions(this, reqObj.context, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    res.headers = _.merge(res.headers, reqObj.headers);
                    res.body = objectToSave;
                    logger.debug('restClient postBody:', JSON.stringify(res));
                    request.post(res, _this.handleResponse.bind(this, cb));
                }
            });
        },
        putBody: function (reqObj, objectToSave, cb) {
            var _this = this;
            getRequestOptions(this, reqObj.context, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    res.headers = _.merge(res.headers, reqObj.headers);
                    res.body = objectToSave;
                    logger.debug('restClient postBody:', JSON.stringify(res));
                    request.put(res, _this.handleResponse.bind(this, cb));
                }
            });
        },
        update: function (reqObj, id, objectToSave, cb) {
            var _this = this;

            if (id)
                reqObj.context = reqObj.context + '/' + id;

            getRequestOptions(this, reqObj.context, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    res.headers = _.merge(res.headers, reqObj.headers);
                    res.json = objectToSave;
                    logger.debug('restClient update:', JSON.stringify(res));
                    request.patch(res, _this.handleResponse.bind(this, cb));
                }
            });
        },
        saveYaml: function (reqObj, objectToSave, cb) {
            var _this = this;
            if (reqObj.headers)
                reqObj.headers['Content-Type'] = 'application/yaml';

            getRequestOptions(this, reqObj.context, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    res.headers = _.merge(res.headers, reqObj.headers);
                    res.body = objectToSave;
                    res.json = false;
                    logger.debug('restClient saveYaml:', JSON.stringify(res));
                    request.post(res, _this.handleResponse.bind(this, cb));
                }
            });
        },

        delete: function (reqObj, id, cb) {
            var _this = this;

            if (id)
                reqObj.context = reqObj.context + '/' + id;

            getRequestOptions(this, reqObj.context, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    logger.debug('restClient delete:', JSON.stringify(res));
                    request.delete(res, _this.handleResponse.bind(this, cb));
                }
            });
        }



    }
}

module.exports = RestClient;