import msRestAzure = require("./ms-rest-azure");
import azureServiceClient = require("./AzureServiceClient");
import util = require("util");
import tl = require('vsts-task-lib/task');
import Q = require("q");

export class ResourceManagementClient extends azureServiceClient.ServiceClient {
    private longRunningOperationRetryTimeout;
    private generateClientRequestId;
    private subscriptionId;
    private baseUri;
    private apiVersion;
    private acceptLanguage;

    public deployments;
    public resourceGroups;

    constructor(credentials: msRestAzure.ApplicationTokenCredentials, subscriptionId: string) {
        super(credentials);
        this.apiVersion = '2016-07-01';
        this.acceptLanguage = 'en-US';
        this.longRunningOperationRetryTimeout = 30;
        this.generateClientRequestId = true;
        if (credentials === null || credentials === undefined) {
            throw new Error(tl.loc("CredentialsCannotBeNull"));
        }
        if (subscriptionId === null || subscriptionId === undefined) {
            throw new Error(tl.loc("SubscriptionIdCannotBeNull"));
        }
        this.baseUri = 'https://management.azure.com';
        this.subscriptionId = subscriptionId;
        this.resourceGroups = new ResourceGroups(this);
        this.deployments = new Deployments(this);
    }

    public getRequestUri(uriFormat: string, parameters: {}, queryParameters?: string[]): string {
        var requestUri = this.baseUri + uriFormat;
        requestUri = requestUri.replace('{subscriptionId}', encodeURIComponent(this.subscriptionId));
        for (var key in parameters) {
            requestUri = requestUri.replace(key, encodeURIComponent(parameters[key]));
        }

        // trim all duplicate forward slashes in the url
        var regex = /([^:]\/)\/+/gi;
        requestUri = requestUri.replace(regex, '$1');

        // process query paramerters
        queryParameters = queryParameters || [];
        queryParameters.push('api-version=' + encodeURIComponent(this.apiVersion));
        requestUri += '?' + queryParameters.join('&');

        return requestUri
    }

    public beginRequest(request: azureServiceClient.WebRequest): Promise<azureServiceClient.WebResponse> {
        request.headers = request.headers || {};
        // Set default Headers
        if (this.acceptLanguage) {
            request.headers['accept-language'] = this.acceptLanguage;
        }
        request.headers['Content-Type'] = 'application/json; charset=utf-8';

        return super.beginRequest(request);
    }
}

export class ResourceGroups {
    private client: ResourceManagementClient;

    constructor(armClient: ResourceManagementClient) {
        this.client = armClient;
    }

    public checkExistence(resourceGroupName: string, callback) {
        if (!callback) {
            throw new Error(tl.loc("CallbackCannotBeNull"));
        }
        // Validate
        try {
            if (!resourceGroupName === null || resourceGroupName === undefined || typeof resourceGroupName.valueOf() !== 'string') {
                throw new Error(tl.loc("ResourceGroupCannotBeNull"));
            }
            if (resourceGroupName !== null && resourceGroupName !== undefined) {
                if (resourceGroupName.length > 90) {
                    throw new Error(tl.loc("ResourceGroupExceededLength"));
                }
                if (resourceGroupName.length < 1) {
                    throw new Error(tl.loc("ResourceGroupDeceededLength"));
                }
                if (resourceGroupName.match(/^[-\w\._\(\)]+$/) === null) {
                    throw new Error(tl.loc("ResourceGroupDoesntMatchPattern"));
                }
            }
        } catch (error) {
            return callback(error);
        }

        // Create HTTP transport objects
        var httpRequest = new azureServiceClient.WebRequest();
        httpRequest.method = 'HEAD';
        httpRequest.uri = this.client.getRequestUri(
            '//subscriptions/{subscriptionId}/resourcegroups/{resourceGroupName}',
            {
                '{resourceGroupName}': resourceGroupName
            }
        );

        // Send Request and process response.
        this.client.beginRequest(httpRequest).then((response: azureServiceClient.WebResponse) => {
            var deferred = Q.defer<azureServiceClient.ApiResult>();
            if (response.statusCode == 204 || response.statusCode == 404) {
                deferred.resolve(new azureServiceClient.ApiResult(null, response.statusCode == 204));
            }
            else {
                deferred.reject(new azureServiceClient.ApiResult(azureServiceClient.ToError(response)));
            }
            return deferred.promise;
        }).then((apiResult: azureServiceClient.ApiResult) => callback(apiResult.error, apiResult.result),
            (error) => callback(error));
    }

    public deleteMethod(resourceGroupName, callback) {
        var client = this.client;
        if (!callback) {
            throw new Error(tl.loc("CallbackCannotBeNull"));
        }
        // Validate
        try {
            if (resourceGroupName === null || resourceGroupName === undefined || typeof resourceGroupName.valueOf() !== 'string') {
                throw new Error(tl.loc("ResourceGroupCannotBeNull"));
            }
            if (resourceGroupName !== null && resourceGroupName !== undefined) {
                if (resourceGroupName.length > 90) {
                    throw new Error(tl.loc("ResourceGroupExceededLength"));
                }
                if (resourceGroupName.length < 1) {
                    throw new Error(tl.loc("ResourceGroupDeceededLength"));
                }
                if (resourceGroupName.match(/^[-\w\._\(\)]+$/) === null) {
                    throw new Error(tl.loc("ResourceGroupDoesntMatchPattern"));
                }
            }
        } catch (error) {
            return callback(error);
        }

        // Create HTTP transport objects
        var httpRequest = new azureServiceClient.WebRequest();
        httpRequest.method = 'DELETE';
        httpRequest.uri = this.client.getRequestUri(
            '//subscriptions/{subscriptionId}/resourcegroups/{resourceGroupName}',
            {
                '{resourceGroupName}': resourceGroupName
            }
        );

        this.client.beginRequest(httpRequest).then((response: azureServiceClient.WebResponse) => {
            var deferred = Q.defer<azureServiceClient.ApiResult>();
            var statusCode = response.statusCode;
            if (statusCode !== 202 && statusCode !== 200) {
                deferred.reject(new azureServiceClient.ApiResult(azureServiceClient.ToError(response)));
            }

            // Create Result
            this.client.getLongRunningOperationResult(response).then((response: azureServiceClient.WebResponse) => {
                if (response.statusCode == 200) {
                    deferred.resolve(new azureServiceClient.ApiResult(null, response.body));
                }
                else {
                    deferred.reject(new azureServiceClient.ApiResult(azureServiceClient.ToError(response)));
                }
            });
            return deferred.promise;
        }).then((apiResult: azureServiceClient.ApiResult) => callback(apiResult.error, apiResult.result),
            (error) => callback(error));
    }

    public createOrUpdate(resourceGroupName, parameters, callback) {
        var client = this.client;
        if (!callback) {
            throw new Error(tl.loc("CallbackCannotBeNull"));
        }
        // Validate
        try {
            if (resourceGroupName === null || resourceGroupName === undefined || typeof resourceGroupName.valueOf() !== 'string') {
                throw new Error(tl.loc("ResourceGroupCannotBeNull"));
            }
            if (resourceGroupName !== null && resourceGroupName !== undefined) {
                if (resourceGroupName.length > 90) {
                    throw new Error(tl.loc("ResourceGroupExceededLength"));
                }
                if (resourceGroupName.length < 1) {
                    throw new Error(tl.loc("ResourceGroupDeceededLength"));
                }
                if (resourceGroupName.match(/^[-\w\._\(\)]+$/) === null) {
                    throw new Error(tl.loc("ResourceGroupDoesntMatchPattern"));
                }
            }
            if (parameters === null || parameters === undefined) {
                throw new Error(tl.loc("ParametersCannotBeNull"));
            }
        } catch (error) {
            return callback(error);
        }

        // Create HTTP transport objects
        var httpRequest = new azureServiceClient.WebRequest();
        httpRequest.method = 'PUT';
        httpRequest.headers = {};
        httpRequest.uri = this.client.getRequestUri(
            '//subscriptions/{subscriptionId}/resourcegroups/{resourceGroupName}',
            {
                '{resourceGroupName}': resourceGroupName,
            }
        );

        // Serialize Request
        if (parameters !== null && parameters !== undefined) {
            httpRequest.body = JSON.stringify(parameters);
        }

        // Send Request
        this.client.beginRequest(httpRequest).then((response: azureServiceClient.WebResponse) => {
            var deferred = Q.defer<azureServiceClient.ApiResult>();
            var statusCode = response.statusCode;
            if (statusCode !== 200 && statusCode !== 201) {
                deferred.reject(new azureServiceClient.ApiResult(azureServiceClient.ToError(response)));
            }
            else {
                deferred.resolve(new azureServiceClient.ApiResult(null, response.body));
            }
            return deferred.promise;
        }).then((apiResult: azureServiceClient.ApiResult) => callback(apiResult.error, apiResult.result),
            (error) => callback(error));
    }
}

export class Deployments {
    private client: ResourceManagementClient;

    constructor(client: ResourceManagementClient) {
        this.client = client;
    }

    public createOrUpdate(resourceGroupName, deploymentName, parameters, callback) {
        var client = this.client;
         if (!callback) {
            throw new Error(tl.loc("CallbackCannotBeNull"));
        }
        // Validate
        try {
            if (resourceGroupName === null || resourceGroupName === undefined || typeof resourceGroupName.valueOf() !== 'string') {
                throw new Error(tl.loc("ResourceGroupCannotBeNull"));
            }
            if (resourceGroupName !== null && resourceGroupName !== undefined) {
                if (resourceGroupName.length > 90) {
                    throw new Error(tl.loc("ResourceGroupExceededLength"));
                }
                if (resourceGroupName.length < 1) {
                    throw new Error(tl.loc("ResourceGroupDeceededLength"));
                }
                if (resourceGroupName.match(/^[-\w\._\(\)]+$/) === null) {
                    throw new Error(tl.loc("ResourceGroupDoesntMatchPattern"));
                }
            }
            if (deploymentName === null || deploymentName === undefined || typeof deploymentName.valueOf() !== 'string') {
                throw new Error(tl.loc("DeploymentNameCannotBeNull"));
            }
            if (parameters === null || parameters === undefined) {
                throw new Error(tl.loc("ParametersCannotBeNull"));
            }
        } catch (error) {
            return callback(error);
        }

        // Create HTTP transport objects
        var httpRequest = new azureServiceClient.WebRequest();
        httpRequest.method = 'PUT';
        httpRequest.headers = {};
        httpRequest.uri = this.client.getRequestUri(
            '//subscriptions/{subscriptionId}/resourcegroups/{resourceGroupName}/providers/Microsoft.Resources/deployments/{deploymentName}',
            {
                '{resourceGroupName}': resourceGroupName,
                '{deploymentName}': deploymentName
            }
        );

        // Serialize Request
        if (parameters !== null && parameters !== undefined) {
            httpRequest.body = JSON.stringify(parameters);
        }

        // Send Request
        this.client.beginRequest(httpRequest).then((response: azureServiceClient.WebResponse) => {
            return new Promise<azureServiceClient.ApiResult>((resolve, reject) => {
                var statusCode = response.statusCode;
                if (statusCode !== 200 && statusCode !== 201) {
                    resolve(new azureServiceClient.ApiResult(azureServiceClient.ToError(response)));
                }
                else {
                    this.client.getLongRunningOperationResult(response).then((operationResponse) => {
                        this.get(resourceGroupName, deploymentName, (error, response) => {
                            if (error) {
                                resolve(new azureServiceClient.ApiResult(error));
                            } else {
                                if (response.properties.provisioningState === "Succeeded") {
                                    resolve(new azureServiceClient.ApiResult(null, response));
                                } else {
                                    resolve(new azureServiceClient.ApiResult(response.properties.error));
                                }
                            }
                        });
                    });
                }
            });
        }).then((apiResult: azureServiceClient.ApiResult) => callback(apiResult.error, apiResult.result),
            (error) => callback(error));
    }

    public get(resourceGroupName, deploymentName, callback) {
        // Create HTTP transport objects
        var httpRequest = new azureServiceClient.WebRequest();
        httpRequest.method = 'GET';
        httpRequest.uri = this.client.getRequestUri(
            '//subscriptions/{subscriptionId}/resourcegroups/{resourceGroupName}/providers/Microsoft.Resources/deployments/{deploymentName}',
            {
                '{resourceGroupName}': resourceGroupName,
                '{deploymentName}': deploymentName
            }
        );

        // Send Request and process response.
        this.client.beginRequest(httpRequest).then((response: azureServiceClient.WebResponse) => {
            var deferred = Q.defer<azureServiceClient.ApiResult>();

            if (response.statusCode != 200) {
                deferred.reject(new azureServiceClient.ApiResult(azureServiceClient.ToError(response)));
            }
            else {
                deferred.resolve(new azureServiceClient.ApiResult(null, response.body));
            }
            return deferred.promise;
        }).then((apiResult: azureServiceClient.ApiResult) => callback(apiResult.error, apiResult.result),
            (error) => callback(error));
    }
}