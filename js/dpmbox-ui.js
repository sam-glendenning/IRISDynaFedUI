/* ============================================================
 *
 * dpmbox-ui.js v0.6.0
 * https://github.com/calvellido/DPMbox
 * Copyright (c) 2014 Juan Valencia Calvellido (juanvalenciacalvellido@gmail.com)
 *
 * ============================================================
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ============================================================ */

//An anonymous function to keep things outside the global scope
(function (window, document, undefined) {

    //Activate an exhaustive mode in JavaScript code 'hinters' like JSHint or JSLint
    'use strict';
    /* jshint browser: true, devel: true, jquery: true, eqeqeq: true, maxerr: 1000, quotmark: single */


    /*************************************************
     * Initial checkings
     *************************************************/

    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        // Great success! All the File APIs are supported.
    }
    else {
        w2alert('The File APIs are not fully supported in this browser. File upload won\'t be possible.');
    }


    /*************************************************
     * Functions to be executed at start (DOM ready)
     *************************************************/

    $(function() {
        setLayout();
        setSidebar();
        setGrid();
        setToolbar();
    });

    /*************************************************
     * Support functions
     *************************************************/

    /* The next two functions operate over a route (http://arioch.cern.ch/dpm/cern.ch/home/dteam/)
     * and compose different structures of data that are needed for some DPMbox operations.
     * It would be ideal not to recalculate continuosly this data, and have it permanently at the
     * system and change it appropiately while running... That would be studied. Anyway working
     * this way the performance is not bad so we can live with it by now.
     */

    //A function that constructs a breadcrumb from a route setting the links incrementally
    function breadcrumbConstruct(route){
        route = decodeURI(route); //DPM servers responds with encoded locations
        var route_array = route.split('/');
        var incremental_route = route_array[0] + '//' + route_array[2];
        for(var i=3, len=route_array.length; i < len; i++){
            incremental_route = incremental_route + '/' + route_array[i];
            route_array[i] = '<a href="' + encodeURI(incremental_route) + '">' + escapeHtml(route_array[i]) + '</a>';
        }
        route_array.shift();
        route_array.shift();
        return (route_array.join(' > '));
    }

    //A function that constructs a tree going through the location
    function uppertreeConstruct(route){
        route = decodeURI(route); //DPM servers responds with encoded locations
        var tree_array = route.split('/');
        tree_array.pop(); //route should include a final backslash, so we get rid of it
        tree_array.pop(); //The last element now is the collection we're in, but we're interested in its parents
        var route_array = route.split('/');
        route_array.shift(); //The first element is the protocol
        route_array.shift(); //The second element is empty
        route_array.shift(); //The third element is the server
        route_array.pop(); //route should include a final backslash, so we get rid of this element
        route_array.pop(); //The last element now is the collection we're in, but we're interested in its parents, so off we go too
        route_array[0] = '/' + route_array[0] + '/';
        for(var i=1, len=route_array.length; i < len; i++){
            route_array[i] = route_array[i-1] + route_array[i] + '/'; //The final backslash is needed
        }
        route_array.unshift('root');

        tree_array[tree_array.length-1] = { id: w2utils.base64encode(route_array[route_array.length-1]), text: escapeHtml(decodeURI(tree_array[tree_array.length-1])), path: encodeURI(route_array[route_array.length-1]), icon: 'fa fa-folder-o', expanded: true, first_parent: true };
        for(var i=tree_array.length-2; i > 1; i--){
            tree_array[i] = { id: w2utils.base64encode(route_array[i-2]), text: escapeHtml(decodeURI(tree_array[i])), path: encodeURI(route_array[i-2]), icon: 'fa fa-folder-o', expanded: true, nodes: [tree_array[i+1]] };
        }

        tree_array.shift();
        tree_array.shift();
        tree_array[0].group = true;
        return (tree_array[0]);
    }

    /* A general error popup that get the message received by the server
     * and presents it on screen.
     *
     * @xhr: the xhr object where to read the error parameters
     * @func: function to execute on close of the popup
     */
    function errorPopup(xhr, func){
        if (xhr.status === 401)
        {
            w2popup.open({
                title: 'Session Expired',
                body: "Your session has expired. Please authenticate again.",
                modal: false,
                showClose: true,
                onClose: func,
                width: 600,
                height: 400,
                buttons: '<button class="btn" onclick="location.reload(true);">Authenticate</button>'
            });
        }
        else
        {
            w2popup.open({
                title: 'Error: ' +  xhr.statusText[0].toUpperCase() + xhr.statusText.substring(1)  + ' ('+ xhr.status + ')',
                body: xhr.responseText,
                modal: false,
                showClose: true,
                onClose: func,
                width: 600,
                height: 400,
                buttons: '<button class="btn" onclick="w2popup.close();">Accept</button>'
            });
        }
    }

    /* A summary popup that prints the files that have been processed or not.
     *
     * @title: the title for the popup
     * @files: the files array
     * @results: the results array
     * @func: function to execute on close of the popup
     */
    function summaryPopup(title, files, results, func){

        function composeHtml(){
            var html;
            if (files.length === 1) //Just one file
                html = results[0].responseText;
            else{
                html = '<ul>';
                for (var i = 0; i < files.length; i++) {
                    if (results[i].status === 204 || results[i].status === 202){
                        results[i].status = 'OK';
                        results[i].statusText = 'Processed';
                    }
                    html += '<li>' + config.server + files[i] + ': ' + results[i].statusText + ' (' + results[i].status + ')</li>';
                }
                html += '</ul>';
            }
            return html;
        }

        w2popup.open({
            title: title,
            body: composeHtml(),
            modal: false,
            showClose: true,
            onClose: func,
            width: 600,
            height: 400,
            buttons: '<button class="btn" onclick="w2popup.close();">Accept</button>'
        });
    }

    /* A function to format properly the size, it will show no suffix
     * for bytes size and its appropiate suffix for bigger sizes.
     */
    function sizeNotBt (sizeStr) {
        if (!w2utils.isFloat(sizeStr) || sizeStr === '') return '';
        sizeStr = parseFloat(sizeStr);
        if (sizeStr === 0) return 0;
        var sizes = ['', 'KB', 'MB', 'GB', 'TB'];
        var i = parseInt( Math.floor( Math.log(sizeStr) / Math.log(1024) ) );
        return (Math.floor(sizeStr / Math.pow(1024, i) * 10) / 10).toFixed(i === 0 ? 0 : 1) + ' ' + sizes[i];
    }

    /*************************************************
     * Files upload
     *************************************************/

    var fileSelector = document.createElement('input');
    fileSelector.setAttribute('type', 'file');
    fileSelector.setAttribute('multiple', 'multiple');

    var selectDialogueLink = document.createElement('a');
    selectDialogueLink.setAttribute('href', '');

    selectDialogueLink.onclick = function () {
        fileSelector.click();
        return false;
    };

    function handleFileSelect(evt) { //This is kind of a mess now. Upload manager: TODO

    //     var files = evt.target.files; // files is a FileList of File objects.
    //     w2ui.grid.lock('Uploading...');

    //     for (var i = 0; i < files.length; i++) {
    //             /* Though they work differently, this upload method works for WebDAV and DPM servers.
    //              * Anyway, maybe a better differentiation of the differents situations can be done.
    //              * TODO
    //              */

    //             /* We create a first PUT request, the server will answer
    //              * with the Location header, where we then send the
    //              * second PUT and the real upload will be made.
    //              */

    //             $.ajax({
    //                 method: 'PUT',
    //                 url: config.server + location.pathname + files[i].name,
    //                 // headers: {
    //                 //     'X-No-Redirect': 1,
    //                 //     'Access-Control-Request-Headers': 'Origin'
    //                 // },
    //                 data: ' ',
    //                 actual_data: files[i],
    //                 async: true,
    //                 complete: function(xhr) {

    //                     // Not reaching here because the returned xhr does not contain the necessary Allow Origin header

    //                     switch(xhr.status){
    //                         case 201: //Almost uploaded (WebDAV),
    //                         case 202: //Accepted by the server (DPM)
    //                             // let formdata = new FormData();
    //                             // formdata.append("file", this.actual_data);
    //                             // fetch(xhr.getResponseHeader('Location'), { 
    //                             //     method: 'POST', 
    //                             //     body: formdata
    //                             // }).then(function(xhr) {
    //                             //     switch(xhr.status){
    //                             //         case 204: //Uploaded (WebDAV)
    //                             //         case 201: //Uploaded (DPM)
    //                             //             w2ui.grid.unlock();
    //                             //             w2alert('Uploaded ' + escapeHtml(this.data.name) + '(' + (this.data.type || 'n/a') + ') - ' + this.data.size + ' bytes', 'Upload complete');
    //                             //             refreshContent(location.pathname);
    //                             //             break;
    //                             //         default: //Unknown error (permissions, network...)
    //                             //             errorPopup(xhr, w2ui.grid.unlock());
    //                             //     }
    //                             // });
    //                             // break;


    //                             // console.log(xhr.getAllResponseHeaders());
    //                             // const xhr2 = new XMLHttpRequest();
    //                             // //xhr2.withCredentials = true;
    //                             // let formdata = new FormData();
    //                             // formdata.append("file", this.actual_data);

    //                             // xhr2.addEventListener("readystatechange", function() {
    //                             //     if(this.readyState === 4) {
    //                             //       console.log(this.responseText);
    //                             //     }
    //                             // });

    //                             // xhr2.open("POST", xhr.getResponseHeader('Location'));
    //                             // xhr2.send(formdata); 
    //                             // w2ui.grid.unlock();
    //                             // refreshContent(location.pathname);
    //                             // break

    //                             $.dpm(xhr.getResponseHeader('Location')).put({
    //                                 complete:  function(xhr) {
    //                                     switch(xhr.status){
    //                                         case 204: //Uploaded (WebDAV)
    //                                         case 201: //Uploaded (DPM)
    //                                             w2ui.grid.unlock();
    //                                             w2alert('Uploaded ' + escapeHtml(this.data.name) + '(' + (this.data.type || 'n/a') + ') - ' + this.data.size + ' bytes', 'Upload complete');
    //                                             refreshContent(location.pathname);
    //                                             break;
    //                                         default: //Unknown error (permissions, network...)
    //                                             errorPopup(xhr, w2ui.grid.unlock());
    //                                     }
    //                                 },
    //                                 async: true,
    //                                 data: this.actual_data,
    //                                 contentType: false,
    //                                 processData: false
    //                             });
    //                             break;
    //                         default: //Unknown error (permissions, network...)
    //                             errorPopup(xhr, w2ui.grid.unlock());
    //                     }
    //                 }
    //             });
    //     }

    // }

    // document.body.appendChild(selectDialogueLink);
    // fileSelector.addEventListener('change', handleFileSelect, false);

        var files = evt.target.files; // files is a FileList of File objects.
        w2ui.grid.lock('Uploading...');

        for (var i = 0; i < files.length; i++) {
                /* Though they work differently, this upload method works for WebDAV and DPM servers.
                * Anyway, maybe a better differentiation of the differents situations can be done.
                * TODO
                */

                /* We create a first PUT request, the server will answer
                * with the Location header, where we then send the
                * second PUT and the real upload will be made. A preflight OPTIONS request is made to the s3.echo URL first
                * to check if it allows PUT requests from this domain. If it does (which it should, all imported buckets are given the
                * right CORS configuration), then the upload can take place.
                */

                $.ajax({
                    method: 'PUT',
                    url: config.server + location.pathname + files[i].name,
                    headers: {
                        'X-No-Redirect': 1
                    },
                    data: ' ',
                    actual_data: files[i],
                    async: true,
                    complete: function(xhr) {
                        switch(xhr.status){
                            case 201: //Almost uploaded (WebDAV),
                            case 202: //Accepted by the server (DPM)
                            
                                $.dpm(xhr.getResponseHeader('Location')).put({
                                    complete:  function(xhr2) {
                                        switch(xhr2.status){
                                            case 204: //Uploaded (WebDAV)
                                            case 201: //Uploaded (DPM)
                                                w2ui.grid.unlock();
                                                w2alert('Uploaded ' + escapeHtml(this.data.name) + '(' + (this.data.type || 'n/a') + ') - ' + this.data.size + ' bytes', 'Upload complete');
                                                refreshContent(location.pathname);
                                                break;
                                            default: //Unknown error (permissions, network...)
                                                errorPopup(xhr2, w2ui.grid.unlock());
                                        }
                                    },
                                    async: true,
                                    data: this.actual_data,
                                    contentType: false,
                                    processData: false
                                });
                                break;
                            default: //Unknown error (permissions, network...)
                                errorPopup(xhr, w2ui.grid.unlock());
                        }
                    }
                });
        }

    }

document.body.appendChild(selectDialogueLink);
fileSelector.addEventListener('change', handleFileSelect, false);


    /*************************************************
     * Files download
     * ! DownloadJS v0.5.2
     * Denis Radin aka PixelsCommander
     * Article about: http://pixelscommander.com/en/javascript/javascript-file-download-ignore-content-type/
     *************************************************/

    var downloadFile = function (sUrl) {
        //iOS devices do not support downloading. We have to inform user about this.
        if (/(iP)/g.test(navigator.userAgent)) {
            w2alert('Your device does not support files downloading. Please try again in desktop browser.');
            return false;
        }
        //If in Chrome or Safari - download via virtual link click
        if (downloadFile.isChrome || downloadFile.isSafari) {
            //Creating new link node.
            var link = document.createElement('a');
            link.href = sUrl;

            if (link.download !== undefined) {
                //Set HTML5 download attribute. This will prevent file from opening if supported.
                var fileName = sUrl.substring(sUrl.lastIndexOf('/') + 1, sUrl.length);
                link.download = fileName;
            }
            //Dispatching click event.
            if (document.createEvent) {
                var e = document.createEvent('MouseEvents');
                e.initEvent('click', true, true);
                link.dispatchEvent(e);
                return true;
            }
        }
        window.open(sUrl, '_self');
        return true;
    };
    downloadFile.isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
    downloadFile.isSafari = navigator.userAgent.toLowerCase().indexOf('safari') > -1;


    /*************************************************
     * Setting the link to the previous UI
     * It basically just set a cookie on the browser
     *************************************************/

    // var oldUILink = document.createElement('a');
    // oldUILink.setAttribute('href', '#');
    // oldUILink.innerText = 'Switch back to old UI';
    // oldUILink.text = 'Switch back to old UI';
    // oldUILink.onclick = function() {
    // 	document.cookie = 'lcgdm_dav.ui=old; path=/; expires=Thu, 1 January 1970 00:00:00 GMT;';
    // 	location.reload(true);
    // };
    // document.body.appendChild(oldUILink);


    /*************************************************
     * w2ui components related functions
     *************************************************/

    /* A function to refresh the sidebar, and all its related content...
     */
    function refreshSidebar(sidebar_id){
        w2ui.grid.lock('Loading...');
        var record = w2ui.sidebar.get(sidebar_id);
        $.dpm(config.server + record.path).readFolder({
            success: function(dat) {
                //Grid
                w2ui.grid.clear();
                w2ui.grid.add($.dpmFilters.filesJSON(dat));
                w2ui.layout.content('right', '<div class="label-section">Properties</div><br><br><img width="100px" height="100px" alt="collection" src="/static/DPMbox/img/folder.png"><br><div style="margin-top:8px; font-size:14px;">Collection</div><br><b>Name: </b>' + record.text + '<br><br><b>Route: </b>' + escapeHtml(decodeURI(record.path)) + '<br><br><b>Children: </b>' + record.nodes.length + '<br><br><b>Files: </b>' + w2ui.grid.total);
                w2ui.grid.unlock();
                //Sidebar
                w2ui.sidebar.add(record.id, $.dpmFilters.treeJSONchildren(dat));
                w2ui.sidebar.get(record.id).icon = 'fa fa-folder'; //In success we change the icon showing that the node has been read
                w2ui.sidebar.refresh(record.id); //We need to refresh it to show the changes
                if (w2ui.sidebar.get(record.id).nodes.length) //We only expand a node if children have been added to it
                    w2ui.sidebar.expand(record.id);
            },
            complete: function(xhr){
                switch(xhr.status){
                    case 207: //Success case
                        break;
                    default: //Unknown error (permissions, network...)
                        errorPopup(xhr, w2ui.grid.unlock());
                }
            }
        });
        if (w2ui.sidebar.selected !== record.id){
            //For DPMbox and DPM node on the same server
            var route = config.server + record.path;
            history.pushState(null, null, route); //Won't reload the page at all
            $('#breadcrumb').html(breadcrumbConstruct(route));
        }
    }

    /* A function to refresh the just the grid content
     */
    function refreshContent(directory_route){
        w2ui.grid.lock('Loading...');
        $.dpm(config.server + directory_route).readFolder({
            success:    function(dat) {
                w2ui.grid.clear();
                w2ui.grid.add($.dpmFilters.filesJSON(dat));
                w2ui.grid.unlock();
            },
            complete: function(xhr){
                switch(xhr.status){
                    case 207: //Success case
                        break;
                    default: //Unknown error (permissions, network...)
                        errorPopup(xhr, w2ui.grid.unlock());
                }
            }
        });
    }


    /* Layout definition
     */
    function setLayout(){
        var pstyle_borderless = 'background-color: #FFF; padding: 5px; overflow-y:hidden;';
        var pstyle_borderleft = 'background-color: #FFF; border-left: 1px solid #CCC; padding: 5px; height: 95%; text-align: center;';
        var pstyle_borderright = 'background-color: #FFF; border-right: 1px solid #CCC; padding: 5px; height: 95%;';

        $('#layout').w2layout({
            name: 'layout',
            panels: [
                { type: 'top',  size: 60, resizable: false, style: pstyle_borderless, content: '<div id="label-main"><b>'+ config.display_name +'</b></div><div id="breadcrumb">'+ breadcrumbConstruct(config.url()) + '</div>' },
                { type: 'left', size: '20%', resizable: true, style: pstyle_borderright, content: '<div class="label-section">Workspace</div><div id="sidebar_div" style="height: 90%; width: 100%;"></div>' },
                { type: 'main', size: '60%', resizable: true, style: pstyle_borderless, content: '<div class="label-section">Data</div><div id="toolbar_div" style="padding: 4px; border-radius: 3px"></div><div id="grid"; style="width: 100%; height: 85%;"></div>' },
                { type: 'right', size: '20%', resizable: true, style: pstyle_borderleft, content: '<div class="label-section">Properties</div>' }
            ]
        });
    }


    /* Sidebar definition
     */
    function setSidebar() {
        //We build the upper tree just parsing the location
        var upper_tree = uppertreeConstruct(config.server + location.pathname);

        $('#sidebar_div').w2sidebar({
            name: 'sidebar',
            nodes: upper_tree,
            onClick: function (event) {
                refreshSidebar(event.target);
            }
        });

    }


    /* Grid definition
     */
    function setGrid() {
        $('#grid').w2grid({
            name: 'grid',
            show:{'footer': true,
                'toolbar': true,
                'header': false,
                toolbarReload   : true,
                toolbarColumns  : true,
                toolbarSearch   : true,
                toolbarDelete   : true
            },
            multiSearch: true,
            searches: [
                { field: 'filename', caption: 'Filename ', type: 'text' },
                { field: 'size', caption: 'Size', type: 'float' },
                { field: 'mdate', caption: 'Modified', type: 'date' }
            ],
            sortData: [
                { 'field': 'filename', 'direction': 'asc' }
            ],
            columns: [
                {'caption':'Metalink','field':'metalink','size':'10','min':'15','max':'', 'resizable':true, 'render': function (record) {return '<img src="/static/icons/metalink16.png" alt="[Metalink]" title="Metalink">';}, style: 'text-align: center'},
                {'caption':'Filename','field':'filename','size':'40%','min':'15','max':'','sortable':true,'resizable':true, 'render': function (record) {return (record.filename).split('/').pop();}},
                // {'caption':'Size','field':'size','size':'20','min':'15','max':'','sortable':true,'resizable':true, 'render': function (record) {return (Number(record.size)/1024).toFixed(2) + ' KB';}},
                // {'caption':'Size','field':'size','size':'20','min':'15','max':'','sortable':true,'resizable':true, 'render': function (record) {return (record.size + ' KB');}},
                {'caption':'Size','field':'size','size':'20','min':'15','max':'','sortable':true,'resizable':true, 'render': function (record) {return sizeNotBt(record.size);}},
                // {'caption':'Size','field':'size','size':'20','min':'15','max':'','sortable':true,'resizable':true},
                {'caption':'Modified','field':'mdate','size':'40%','min':'15','max':'','sortable':true,'resizable':true, 'render': function (record) {return w2utils.formatDateTime(record.mdate, 'dd/mm/yyyy,| hh24:mm:ss');}},
                //{'caption':'Modified','field':'mdate','size':'40%','min':'15','max':'','sortable':true,'resizable':true, 'render': 'date', 'hidden': true}
            ],
            records: [
            ],
            onRender: function(){
                $.dpm(config.url()).readFolder({
                    success:    function(dat) {
                        /* Till this moment it hasn't been necessary to make any
                         * HTTP call. Now it is (to set the records on the grid),
                         * so we take advantage of this PROPFIND call and update all
                         * the components that can extract data from it:
                         * sidebar, grid and the properties right sidebar
                         */
                        //First the sidebar that already has the upper tree
                        w2ui.sidebar.add(w2ui.sidebar.find({ first_parent: true })[0].id, $.dpmFilters.treeJSONparent(dat));
                        w2ui.sidebar.select(w2utils.base64encode(decodeURI(location.pathname)));
                        //Now we add the records to the grid
                        w2ui.grid.add($.dpmFilters.filesJSON(dat));
                        //And then the content for the right sidebar
                        var record = w2ui.sidebar.get(w2utils.base64encode(decodeURI(location.pathname)));
                        w2ui.layout.content('right', '<div class="label-section">Properties</div><br><br><img width="100px" height="100px" alt="collection" src="/static/DPMbox/img/folder.png"><br><div style="margin-top:8px; font-size:14px;">Collection</div><br><b>Name: </b>' + record.text + '<br><br><b>Route: </b>' + escapeHtml(decodeURI(record.path)) + '<br><br><b>Children: </b>' + record.nodes.length + '<br><br><b>Files: </b>' + w2ui.grid.total);
                    },
                    complete: function(xhr){
                        switch(xhr.status){
                            case 207: //Success case
                                break;
                            default: //Unknown error (permissions, network...)
                                errorPopup(xhr);
                        }
                    }
                });
            },
            onClick: function (event) {
                if (event.column === 0)
                    window.location = (config.server + event.recid + '?metalink');
            },
            onDblClick: function(event){
                w2ui.toolbar.click('download');
            },
            onDelete: function (event) {
                event.preventDefault(); //Needed by the (weird) way w2ui works... When false the deletion will be executed 2 times (¿?)

                w2confirm({
                        // msg          : 'The following collection (including all its content) will be deleted:<br><br>' + config.server + escapeHtml(decodeURI(w2ui.sidebar.get(w2ui.sidebar.selected).path)),
                        msg          : 'Are you sure you want to delete selected elements?',
                        title        : 'Delete confirmation',
                        yes_text     : 'Accept',     // text for yes button
                        no_text      : 'Cancel',      // text for no button
                    })
                        .yes(function () {
                            w2ui.grid.lock('Deleting...');
                            var delete_array = w2ui.grid.getSelection();
                            var delete_results = new Array(delete_array.length);
                            var delete_count = delete_array.length;
                            var processed_count = delete_array.length;
                            for (var i = 0; i < delete_array.length; i++) {
                                (function(i) { //With this closure I can play with the i value
                                    $.dpm(decodeURI(config.server + delete_array[i])).remove({
                                        complete: function(xhr) {
                                            switch(xhr.status){
                                                case 204:
                                                    delete_count--;
                                                default: //Error 403 forbidden, or other unknow error
                                                    delete_results[i] = xhr;
                                                    processed_count--;
                                                    if (processed_count === 0){
                                                        w2ui.grid.unlock('Deleting...');
                                                        if (delete_count === 0)
                                                            refreshContent(location.pathname); //If all went right there's no need to summary
                                                        else
                                                            summaryPopup('Problems deleting', delete_array, delete_results, refreshContent(location.pathname));
                                                    }
                                                }
                                        }
                                    });
                                })(i); //End of closure
                            }
                        })
                        .no(function () {
                        });
            },
            onReload: function() {
                refreshSidebar(w2ui.sidebar.selected);

            }
        });
    }


    /* Toolbar definition
     */
    function setToolbar(){
        $('#toolbar_div').w2toolbar({
            name: 'toolbar',
            items: [
                { type: 'button',  id: 'import_bucket',  caption: 'Import bucket', icon: 'fa fa-plus-square' },
                { type: 'button',  id: 'remove_bucket',  caption: 'Remove bucket', icon: 'fa fa-minus-square' },
                { type: 'spacer' },
                { type: 'button',  id: 'upload',  caption: 'Upload', icon: 'fa fa-upload' },
                { type: 'button',  id: 'download',  caption: 'Download', icon: 'fa fa-download' }
            ],
            onClick: function (event) {
                var button = this.get(event.target);
                switch(button.id) {
                    case 'import_bucket': // Import bucket
                        request_user_groups("import");
                        break;

                    case 'remove_bucket': // Remove bucket
                        request_user_groups("remove");
                        break;

                    case 'upload': //Upload
                        selectDialogueLink.click();
                        break;

                    case 'download': //Download
                        downloadFile(config.server + w2ui.grid.getSelection());
                        break;
                }
            }
        });
    }

})(window, document); //End of anonymous function to keep things outside the global scope

// New functionality

function importBucket() 
{
	group = document.getElementById('group_list').value;
    bucket = document.getElementById('bucket').value;
    access_key = document.getElementById('access_key').value;
    secret_key = document.getElementById('secret_key').value;

    if (group && bucket && access_key && secret_key && group != "-- Select an option --")
    {
        $.post("/cgi-bin/import.py", {
            'group': group,
            'bucket': bucket,
            'public_key': access_key,
            'private_key': secret_key
        })
        .done(function(resp) {
            w2alert('Imported bucket ' + bucket + ' for group ' + group);
        })
        .fail(function(resp) {
            w2alert('Failed to import bucket ' + bucket + ' for group ' + group);
        })
        .always(function() {
            $('html, body').animate({ scrollTop: 0 }, 'fast');
            w2ui.grid.unlock();
        });

        return true;
    }
    else
    {
        w2alert('Please fill out all fields.');
        return false;
    }
}

function removeBucket() 
{
	group = document.getElementById('group_list').value;
    bucket = document.getElementById('bucket').value;
    access_key = document.getElementById('access_key').value;
    secret_key = document.getElementById('secret_key').value;

    if (group && bucket && access_key && secret_key && group != "-- Select an option --")
    {
        $.post("/cgi-bin/remove.py", {
            'group': group,
            'bucket': bucket,
            'public_key': access_key,
            'private_key': secret_key
        })
        .done(function(resp) {
            w2alert('Removed bucket ' + bucket + ' for group ' + group);
        })
        .fail(function(resp) {
            w2alert('Failed to remove bucket ' + bucket + ' for group ' + group);
        })
        .always(function() {
            $('html, body').animate({ scrollTop: 0 }, 'fast');
            w2ui.grid.unlock();
        });
      
        return true;
    }
    else
    {
        w2alert('Please fill out all fields.');
        return false;
    }
}

function request_user_groups(action)
{
    var x = new XMLHttpRequest();
    x.open('PROPFIND', location, true);
    x.onload = function()
    {
        try 
        {
            user_groups = x.getResponseHeader('oidcgroups').split(",");
            userInputPopup(user_groups, action);
        }
        catch (TypeError)
        {
            w2alert('Error - failed to fetch user groups. Bucket importing and removing is disabled.');
            w2ui.grid.unlock();
        }     
    };
    x.onerror = function() 
    {
        w2alert('Error - failed to fetch user groups. Bucket importing and removing is disabled.');
        w2ui.grid.unlock();
    };
    x.send();
}

function userInputPopup(user_groups, action)
{
    function composeHtml(){
        var html;
        
        var input_form = document.createElement("form");
        input_form.setAttribute("id", "input_form");
        input_form.setAttribute("align", "center");
    
        var group_label = document.createElement("label");
        group_label.setAttribute("for", "groupname");
        group_label.innerHTML = "Group name:";
    
        var group_list = document.createElement("select");
        group_list.setAttribute("name", "group_list");
        group_list.setAttribute("id", "group_list");
        var empty = document.createElement("option");
        empty.setAttribute("disabled", true);
        empty.setAttribute("selected", true);
        empty.setAttribute("style", "display: none");
        empty.innerHTML = "-- Select an option --";
        group_list.appendChild(empty);
        for (var i=0; i<user_groups.length; i++)
        {
            var group = document.createElement("option");
            group.setAttribute("value", user_groups[i]);
            group.innerHTML = user_groups[i];
            group_list.appendChild(group);
        }
    
        var bucket_label = document.createElement("label");
        bucket_label.setAttribute("for", "bucketname");
        bucket_label.innerHTML = "Bucket name:";
        var bucket = document.createElement("input");
        bucket.setAttribute("type", "text");
        bucket.setAttribute("id", "bucket");
        bucket.setAttribute("name", "bucket");
    
        var access_key_label = document.createElement("label");
        access_key_label.setAttribute("for", "access_key");
        access_key_label.innerHTML = "Access key:";
        var access_key = document.createElement("input");
        access_key.setAttribute("type", "text");
        access_key.setAttribute("id", "access_key");
        access_key.setAttribute("name", "access_key");
    
        var secret_key_label = document.createElement("label");
        secret_key_label.setAttribute("for", "bucketname");
        secret_key_label.innerHTML = "Secret key:";
        var secret_key = document.createElement("input");
        secret_key.setAttribute("type", "password");
        secret_key.setAttribute("id", "secret_key");
        secret_key.setAttribute("name", "secret_key");
    
        input_form.appendChild(group_label);
        var br = document.createElement("br");
        input_form.appendChild(br);
        input_form.appendChild(group_list);
        var br = document.createElement("br");
        input_form.appendChild(br);
        input_form.appendChild(bucket_label);
        var br = document.createElement("br");
        input_form.appendChild(br);
        input_form.appendChild(bucket);
        var br = document.createElement("br");
        input_form.appendChild(br);
        input_form.appendChild(access_key_label);
        var br = document.createElement("br");
        input_form.appendChild(br);
        input_form.appendChild(access_key);
        var br = document.createElement("br");
        input_form.appendChild(br);
        input_form.appendChild(secret_key_label);
        var br = document.createElement("br");
        input_form.appendChild(br);
        input_form.appendChild(secret_key);

        html = input_form.outerHTML;
        return html;
    }

    w2ui.grid.lock();

    if (action === "import")
    {
        w2popup.open({
            title: "Import",
            body: composeHtml(),
            modal: false,
            showClose: true,
            onClose: w2ui.grid.unlock(),
            width: 600,
            height: 400,
            buttons: '<button class="btn" onclick="w2popup.close(); importBucket();">Import</button>'
        });
    }
    else if (action === "remove")
    {
        w2popup.open({
            title: "Remove",
            body: composeHtml(),
            modal: false,
            showClose: true,
            onClose: w2ui.grid.unlock(),
            width: 600,
            height: 400,
            buttons: '<button class="btn" onclick="w2popup.close(); removeBucket();">Remove</button>'
        });
    }
}