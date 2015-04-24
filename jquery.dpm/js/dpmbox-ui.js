/* ============================================================
 *
 * dpmbox-ui.js
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
// (function (window, document, undefined) {

    //Activate an exhaustive mode in JavaScript code 'hinters' like JSHint or JSLint
    'use strict';
    /* jshint browser: true, devel: true, jquery: true, eqeqeq: true, maxerr: 1000, quotmark: single */

  // /**
   // * Selectors
   // */
  // var menu = document.querySelector('.menu');
  // var users = document.querySelectorAll('.user');
  // var signout = document.querySelector('.signout');
//
  // /**
   // * Methods
   // */
  // function toggleMenu (event) {
    // if (!this.classList.contains('active')) {
      // this.classList.add('active');
    // }
    // event.preventDefault();
  // }
  // function showUsers (users) {
    // for (var i = 0; i < users.length; i++) {
      // var self = users[i];
      // self.classList.add('visible');
    // }
  // }
  // function signout (users) {
    // var xhr = new XMLHttpRequest();
  // }
//
  // /**
   // * Events/APIs/init
   // */
  // menu.addEventListener('click', toggleMenu, false);
  // signout.addEventListener('click', signout, false);
  // showUsers(users);
//


    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        // Great success! All the File APIs are supported.
    }
    else {
        w2alert('The File APIs are not fully supported in this browser. File upload won\'t be possible.');
    }


    /* Functions to be executed at start (DOM ready)
     */
    $(function() {
        setLayout();
        setSidebar();
        setGrid();
        setToolbar();
    });


    /* The next two functions operate over a route (http://arioch.cern.ch/dpm/cern.ch/home/dteam/) and compose different structures of data
     * that are needed for some DPMbox operations. It would be ideal not to recalculate continuosly this data, and have it permanently at the system
     * and change it appropiately while running... That would be studied. Anyway working this way the performance is not bad so we can live with it by now.
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
        route_array.shift(); //The fisrt element is the protocol
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
        w2popup.open({
            title: xhr.statusText[0].toUpperCase() + xhr.statusText.substring(1)  + ' ('+ xhr.status + ')',
            body: xhr.responseText,
            modal: false,
            showClose: true,
            onClose: func,
            width: 600,
            height: 400,
            buttons: '<button class="btn" onclick="w2popup.close();">Accept</button>'
        });
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
            if (files.length == 1) //Just one file
                html = results[0].responseText;
            else{
                // html = 'There have been problems deleting some of the selected files:<ul>';
                html = '<ul>';
                for (var i = 0; i < files.length; i++) {
                    if (results[i].status == 204 || results[i].status == 202){
                        results[i].status = 'OK';
                        results[i].statusText = 'Processed';
                    }
                    html += '<li>' + config.server + files[i] + ': ' + results[i].statusText + ' (' + results[i].status + ')</li>';
                }
                html += '</ul>';
            }
            return html;
        };

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

    /* Files upload
     */
    var fileSelector = document.createElement('input');
    fileSelector.setAttribute('type', 'file');
    fileSelector.setAttribute('multiple', 'multiple');

    var selectDialogueLink = document.createElement('a');
    selectDialogueLink.setAttribute('href', '');
    //selectDialogueLink.innerText = 'Select File';

    selectDialogueLink.onclick = function () {
        fileSelector.click();
        return false;
    };

    var oldUILink = document.createElement('a');
    oldUILink.setAttribute('href', '#');
    oldUILink.innerText = 'Switch back to old UI';
    oldUILink.text = 'Switch back to old UI';
    oldUILink.onclick = function() {
    	document.cookie = "lcgdm_dav.ui=old; path=/; expires=Thu, 1 January 1970 00:00:00 GMT;";
    	location.reload(true);
    }

    function handleFileSelect(evt) { //This is kind of a mess now

        var files = evt.target.files; // files is a FileList of File objects.
        // var upload_array = new Array(files.length); //A FileList of File objects.
        // var upload_results = new Array(upload_array.length);
        // var upload_count = upload_array.length;
        // var processed_count = upload_array.length;

        w2ui.grid.lock('Uploading...');

        for (var i = 0; i < files.length; i++) {
            // (function(i) { //With this closure I can play with the i value
                /* Though they work differently, this upload method works for WebDAV and DPM servers.
                 * Anyway, maybe a better differentiation of the differents situations can be done.
                 * TODO
                 */

                /* We create a first PUT request
                 * The server will answer with the Location
                 */
                // var req = new XMLHttpRequest();
                // req.open('PUT', config.server + w2ui.sidebar.selected + f.name, false);
                // req.setRequestHeader('X-No-Redirect', 1);
                // req.send(f);

                // upload_array[i] = location.pathname + files[i].name;

                $.ajax({
                    method: 'PUT',
                    // url: config.server + w2ui.sidebar.get(w2ui.sidebar.selected).path + files[i].name,
                    url: config.server + location.pathname + files[i].name,
                    headers: {
                        'X-No-Redirect': 1
                    },
                    data: " ",
                    actual_data: files[i],
                    async: true,
                    complete: function(xhr) {
                        switch(xhr.status){
                            case 201: //Almost uploaded (WebDAV),
                            case 202: //Accepted by the server (DPM)
                                $.dpm(xhr.getResponseHeader('Location')).put({
                                    complete:  function(xhr) {
                                        switch(xhr.status){
                                            case 204: //Uploaded (WebDAV)
                                            case 201: //Uploaded (DPM)
                                                w2ui.grid.unlock();
                                                w2alert('Uploaded ' + escapeHtml(this.data.name) + '(' + (this.data.type || 'n/a') + ') - ' + this.data.size + ' bytes', 'Upload complete');
                                                // refreshContent(location.pathname);
                                                break;
                                                // upload_count--;
                                            default:
                                        }
                                    },
                                    async: true,
                                    data: this.actual_data,
                                    contentType: false,
                                    processData: false
                                });
                                break;
                            default: //Unknown error (permissions, network...)
                                // upload_results[i] = xhr;
                                // processed_count--;
                                // if (processed_count == 0){
                                    // w2ui.grid.unlock();
                                    // if (upload_count == 0){
                                        // w2alert('All files uploaded');
                                        // refreshContent(location.pathname);
                                    // }
                                    // else
                                        // summaryPopup('Problems uploading', upload_array, upload_results, refreshContent(location.pathname));
                                // }
                                errorPopup(xhr, w2ui.grid.unlock());

                        }
                    }
                });
            // })(i); //End of closure
        }

    }

    document.body.appendChild(selectDialogueLink);
    document.body.appendChild(oldUILink);
    fileSelector.addEventListener('change', handleFileSelect, false);


    /* Files download
     * ! DownloadJS v0.5.2
     * Denis Radin aka PixelsCommander
     * Article about: http://pixelscommander.com/en/javascript/javascript-file-download-ignore-content-type/
     */
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
        //Force file download (whether supported by server).
        // if (sUrl.indexOf('?') === -1) {
           // sUrl += '?download';
        // }
        window.open(sUrl, '_self');
        return true;
    };

    downloadFile.isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
    downloadFile.isSafari = navigator.userAgent.toLowerCase().indexOf('safari') > -1;


    /* A function to update the sidebar content
     */
    function refreshSidebar(){
        $.dpm(config.url()).readFolder({
            success:    function(dat) {
                //w2ui.sidebar.add(upper_tree);
                // var first_parent = w2ui.sidebar.find({ first_parent: true });
                w2ui.sidebar.add(w2ui.sidebar.find({ first_parent: true })[0].id, $.dpmFilters.treeDPMparent(dat));
                w2ui.sidebar.select(w2utils.base64encode(location.pathname));
                // w2ui.sidebar.expand(location.pathname);
                // w2ui.sidebar.insert(location.pathname,upper_tree);
                // w2ui.sidebar.add([{'id': 1, 'text': '1', 'icon': 'fa fa-folder'},{'id': 2, 'text': '2', 'icon': 'fa fa-folder'},{'id': 3, 'text': '3', 'icon': 'fa fa-folder'},{'id': 4, 'text': '4', 'icon': 'fa fa-folder'}]);
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
    }


    /* A function to refresh the grid content
     */
    function refreshContent(directory_route){
        w2ui.grid.lock('Loading...');
        $.dpm(config.server + directory_route).readFolder({
            success:    function(dat) {
                w2ui.grid.clear();
                w2ui.grid.add($.dpmFilters.filesDPM(dat));
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

        window.onpopstate = function(event) {
            /* It would be interesting to manipulate the history (as war winners do! :P)
             * coordinated with the sidebar but it's not something simple,
             * so by now we can live reloading the whole DPMbox to the
             * location previously visited (not bad effect at all IMO)
             */
            // var node = w2utils.base64encode(location.pathname);
            // if (w2ui.sidebar.get(node)){
                // console.log(location.pathname);
                // w2ui.sidebar.select(node);
                // w2ui.sidebar.click(node);
            // }
            // else
                window.location = document.location;
        };

        //We build the upper tree just parsing the location
        var upper_tree = uppertreeConstruct(config.server + location.pathname);

        $('#sidebar_div').w2sidebar({
            name: 'sidebar',
            nodes: upper_tree,
            // onCollapse: function (event) { event.preventDefault() },
            onClick: function (event) {
                w2ui.grid.lock('Loading...');
                var record = this.get(event.target);
                $.dpm(config.server + record.path).readFolder({
                    success: function(dat) {
                        //Grid
                        w2ui.grid.clear();
                        w2ui.grid.add($.dpmFilters.filesDPM(dat));
                        w2ui.layout.content('right', '<div class="label-section">Properties</div><br><br><img width="100px" height="100px" alt="collection" src="/static/DPMbox/jquery.dpm/img/folder.png"><br><div style="margin-top:8px; font-size:14px;">Collection</div><br><b>Name: </b>' + record.text + '<br><br><b>Route: </b>' + escapeHtml(decodeURI(record.path)) + '<br><br><b>Children: </b>' + record.nodes.length + '<br><br><b>Files: </b>' + w2ui.grid.total);
                        w2ui.grid.unlock();
                        //Sidebar
                        w2ui.sidebar.add(event.target, $.dpmFilters.treeDPMchildren(dat));
                        // w2ui.sidebar.add(event.target, dat);
                        //Which way is better to expand nodes?
                        // if (item_selected == event.target){
                            // console.log(item_selected);
                            // console.log(event.target);
                            // w2ui.sidebar.toggle(event.target);
                        // }
                        // else{
                        // }
                        w2ui.sidebar.get(record.id).icon = 'fa fa-folder'; //In success we change the icon showing that the node has been read
                        // w2ui.sidebar.get(record.id).count = w2ui.sidebar.get(record.id).nodes.length; //This information (number of children) could be useful but is very ugly
                        // w2ui.sidebar.get(record.id).count = w2ui.grid.total; //This information (number of files of directory) could be useful but is very ugly
                        w2ui.sidebar.refresh(record.id); //We need to refresh it to show the changes
                        w2ui.sidebar.expand(w2ui.sidebar.selected);
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
                //For DPMbox and DPM node on the same server
                var route = config.server + record.path;
                history.pushState(null, null, route); //Won't reload the page at all
                // window.location = route; //It will reload the page completely, not cool but functional

                // $('#breadcrumb').html(config.server.(7) + escapeHtml(decodeURI(route)).replace(/\//g,'</a> > <a href="">'));
                // $('#breadcrumb').html(config.server + escapeHtml(decodeURI(route)).replace(/\//g,'</a> > <a href="">'));
                $('#breadcrumb').html(breadcrumbConstruct(route));

            },
            // onDblClick: function(event) {
                // $.dpm(event.target).readFolder({
                    // success:    function(dat) {
                    // },
                    // dataFilter: $.dpmFilters.treeDPM
                // });
                // event.onComplete = function () {
                    // w2ui['sidebar'].expand(event.target);
                // }
            // },
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
            // toolbar: {
                // items: [
                    // { type: 'button',  id: 'upload',  caption: 'Upload', icon: 'fa fa-upload' },
                    // { type: 'button',  id: 'download',  caption: 'Download', icon: 'fa fa-download' }
                // ]
            // },
            columns: [
                {'caption':'Metalink','field':'metalink','size':'10','min':'15','max':'', 'resizable':true, 'render': function (record) {return '<img src="/static/icons/metalink16.png" alt="[Metalink]" title="Metalink">'}, style: 'text-align: center'},
                {'caption':'Filename','field':'filename','size':'40%','min':'15','max':'','sortable':true,'resizable':true, 'render': function (record) {return (record.filename).split('/').pop();}},
                // {'caption':'Size','field':'size','size':'20','min':'15','max':'','sortable':true,'resizable':true, 'render': function (record) {return (Number(record.size)/1024).toFixed(2) + ' KB';}},
                // {'caption':'Size','field':'size','size':'20','min':'15','max':'','sortable':true,'resizable':true, 'render': function (record) {return (record.size + ' KB');}},
                {'caption':'Size','field':'size','size':'20','min':'15','max':'','sortable':true,'resizable':true, 'render': function (record) {return w2utils.size(record.size);}},
                // {'caption':'Size','field':'size','size':'20','min':'15','max':'','sortable':true,'resizable':true},
                {'caption':'Modified','field':'mdate','size':'40%','min':'15','max':'','sortable':true,'resizable':true, 'render': function (record) {return w2utils.formatDateTime(record.mdate, 'dd/mm/yyyy,| hh24:mm:ss');}},
                {'caption':'Modified','field':'mdate','size':'40%','min':'15','max':'','sortable':true,'resizable':true, 'render': 'date', 'hidden': true}
            ],
            records: [
            ],
            // menu: [
                // { id: 1, text: 'Download', icon: 'fa fa-download' },
                // { id: 2, text: 'Delete Item', icon: 'fa fa-times' }
            // ],
            onRender: function(){
                $.dpm(config.url()).readFolder({
                    success:    function(dat) {
                        /* Till this moment it hasn't been necessary to make any
                         * HTTP call. Now it is (to set the records on the grid),
                         * so we take davantage of this PROPFIND call and update all
                         * the components that can extract data from it:
                         * sidebar, grid and the properties right sidebar
                         */
                        //First the sidebar that already has the upper tree
                        w2ui.sidebar.add(w2ui.sidebar.find({ first_parent: true })[0].id, $.dpmFilters.treeDPMparent(dat));
                        w2ui.sidebar.select(w2utils.base64encode(location.pathname));
                        //Now we add the records to the grid
                        w2ui.grid.add($.dpmFilters.filesDPM(dat));
                        //And then the content for the right sidebar
                        var record = w2ui.sidebar.get(w2utils.base64encode(decodeURI(location.pathname)));
                        w2ui.layout.content('right', '<div class="label-section">Properties</div><br><br><img width="100px" height="100px" alt="collection" src="/static/DPMbox/jquery.dpm/img/folder.png"><br><div style="margin-top:8px; font-size:14px;">Collection</div><br><b>Name: </b>' + record.text + '<br><br><b>Route: </b>' + escapeHtml(decodeURI(record.path)) + '<br><br><b>Children: </b>' + record.nodes.length + '<br><br><b>Files: </b>' + w2ui.grid.total);
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
                if (event.column == 0)
                    window.location = (config.server + event.recid + '?metalink');
                // w2ui['grid2'].clear();
                // var record = this.get(event.recid);
                // w2ui['grid2'].add([
                    // { recid: 0, name: 'ID:', value: record.recid },
                    // { recid: 1, name: 'First Name:', value: record.fname },
                    // { recid: 2, name: 'Last Name:', value: record.lname },
                    // { recid: 3, name: 'Email:', value: record.email },
                    // { recid: 4, name: 'Date:', value: record.sdate }
                // ]);
                // var record = this.get(event.recid);
                // console.log(event);
                // w2ui['layout'].content('right', '<div class='label-section'>Properties</div>' + record.filename + '<br>' + record.size + '<br>' + record.mdate + '<br>');
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
                                                    if (processed_count == 0){
                                                        w2ui.grid.unlock('Deleting...');
                                                        if (delete_count == 0)
                                                            refreshContent(location.pathname); //If all went right there's no need to summary
                                                            // summaryPopup('All correct', delete_array, delete_results, refreshContent(location.pathname));
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
                refreshContent(location.pathname);
            }
        });
    }


    /* Toolbar definition
     */
    function setToolbar(){
        $('#toolbar_div').w2toolbar({
            name: 'toolbar',
            items: [
                { type: 'button',  id: 'new_col',  caption: 'New directory', icon: 'fa fa-plus-square' },
                { type: 'button',  id: 'del_col',  caption: 'Delete directory', icon: 'fa fa-minus-square' },
                { type: 'spacer' },
                { type: 'button',  id: 'upload',  caption: 'Upload', icon: 'fa fa-upload' },
                { type: 'button',  id: 'download',  caption: 'Download', icon: 'fa fa-download' }
            ],
            onClick: function (event) {
                var button = this.get(event.target);
                switch(button.id) {
                    case 'new_col': //New collection

                        w2confirm({
                            msg          : '<label>Name: </label>' +
                                            '<input id="col_name_input" name="name" type="text" style="width: 80%"/>',
                            title        : 'New collection',
                            height       : 200,       //height of the dialog
                            yes_text     : 'Accept',     //text for yes button
                            no_text      : 'Cancel',      //text for no button
                        })
                            .yes(function () {
                                w2ui.grid.lock('Creating...');
                                var collection_name = $(col_name_input).val();
                                // var route = config.server + w2ui.sidebar.get(w2ui.sidebar.selected).path + collection_name;
                                var route = config.server + location.pathname + collection_name;
                                if (collection_name)
                                    $.dpm(route).mkcol({
                                        complete: function(xhr) {
                                            switch(xhr.status){
                                                case 201:
                                                    // w2alert('Collection created at:<br><br>' + config.server + escapeHtml(decodeURI(location.pathname)) + escapeHtml(decodeURI(collection_name))); //This is maybe unnecesary
                                                    w2ui.grid.unlock;
                                                    w2ui.sidebar.click(w2ui.sidebar.selected);
                                                    break;
                                                default: //Error 403 forbidden, or other unknow error
                                                    errorPopup(xhr, function () {
                                                        w2ui.grid.unlock();
                                                        w2ui.sidebar.click(w2ui.sidebar.selected);
                                                    });
                                                    break;
                                            }
                                        }
                                    });
                                else{
                                    w2alert('Invalid collection name');
                                    w2ui.toolbar.click('new_col'); //Reopen the name input dialog
                                }
                            })
                            .no(function () {
                            });
                        break;

                    case 'del_col': //Delete collection

                        w2confirm({
                            // msg          : 'The following collection (including all its content) will be deleted:<br><br>' + config.server + escapeHtml(decodeURI(w2ui.sidebar.get(w2ui.sidebar.selected).path)),
                            msg          : 'The following collection (including all its content) will be deleted:<br><br>' + config.server + escapeHtml(decodeURI(location.pathname)),
                            title        : 'Delete collection',
                            yes_text     : 'Accept',     // text for yes button
                            no_text      : 'Cancel',      // text for no button
                        })
                            .yes(function () {
                                w2ui.grid.lock('Deleting...');
                                // $.dpm(config.server + w2ui.sidebar.get(w2ui.sidebar.selected).path).remove({
                                $.dpm(config.server + location.pathname).remove({
                                    complete: function(xhr) {
                                        switch(xhr.status){
                                            case 204:
                                                // w2alert("Collection deleted");
                                                // w2ui.sidebar.remove(location.pathname);
                                                // refreshContent(w2ui.sidebar.get(w2ui.sidebar.selected).parent['path']);
                                                // refreshContent(w2ui.sidebar.get(location.pathname).parent['path']);
                                                // var parent_location = location.href.split('/');
                                                // parent_location.pop();
                                                // parent_location.pop();
                                                // parent_location = parent_location.join('/');
                                                // window.location = parent_location;
                                                w2ui.grid.unlock();
                                                var parent = w2ui.sidebar.get(w2ui.sidebar.selected).parent.id;
                                                w2ui.sidebar.remove(w2ui.sidebar.selected);
                                                w2ui.sidebar.select(parent);
                                                w2ui.sidebar.click(parent);
                                                break;
                                            default: //Error 403 forbidden, or other unknow error
                                                errorPopup(xhr, w2ui.grid.unlock());
                                            }
                                    }
                                });
                            })
                            .no(function () {
                            });
                        break;

                    case 'upload': //Upload
                        selectDialogueLink.click();
                        break;

                    case 'download': //Download
                        downloadFile(config.server + w2ui.grid.getSelection());
                        break;
                }

                // if (button.id === 'upload'){
                    // selectDialogueLink.click();
                // }
                // else if (button.id === 'download'){
                    // downloadFile(config.server + w2ui.grid.getSelection());
                // }
                // else if (button.id === 'col_new'){
                    // var collection_name = "new_collection";
                    // var route = config.server + w2ui.sidebar.get(w2ui.sidebar.selected).path + collection_name;
                    // w2alert("Name of the new collection: " + collection_name);
                    // $.dpm(route).mkcol({
                        // success: function() {
                            // w2alert("Collection " + collection_name + " created");
                            // $.dpm(route).readFolder({
                                // success:    function(dat) {
                                    // w2ui.sidebar.add(w2ui.sidebar.selected, $.dpmFilters.treeDPMparent(dat));
                                // }
                            // });
                        // }
                    // });
                // }
                // else if (button.id === 'col_delete'){
                    // w2alert(config.server + decodeURI(w2ui.sidebar.get(w2ui.sidebar.selected).path) + " will be deleted<br><br>Are you sure?");
                    // $.dpm(config.server + w2ui.sidebar.get(w2ui.sidebar.selected).path).remove({
                        // success: function() {
                            // //w2alert("Collection deleted");
                            // w2ui.sidebar.remove(w2ui.sidebar.selected);
                            // refreshContent(w2ui.sidebar.get(w2ui.sidebar.selected).parent['id']);
                        // }
                    // });
                // }
            }
        });
    }


// })(window, document); //End of anonymous function to keep things outside the global scope


