/**
 * Created by robotp on 28/05/2017.
 */
// Javascript to communicate with GitHub API

// update info inside the plugin when page is loaded
github_update_file_info(); //show the initial info about the file

// File transfer with GiHub runs with Base64 encoding/decoding. The problem is, that some characters in our text may be special and they
// will not go through btoa / atob correctly or they will crash the function. So I found following two functions which helps and
// everything seems to be then working oki.
// Taken from: https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding

function b64EncodeUnicode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
}

function b64DecodeUnicode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

// This is a temp function used for testing. It compares our content with the content received from GitHub.
// It compares each individual character, just to be sure they are all exactly the same. If there is a difference
// we will know position of the character. It will help us to find it and check the problem.
function compare_two_text_files(original_filecontent, basecontent){
    var result = 'Comparing ...';

    console.log('Length: original_filecontent = ' + original_filecontent.length + ' / basecontent = ' + basecontent.length);

    //find the shorter file
    var file_length =  original_filecontent.length;
    if (file_length > basecontent.length)
        file_length = basecontent.length;

    for (var i=0; i<file_length; i++){
        if (original_filecontent.charAt(i) === basecontent.charAt(i))
        {
            if (result === 'Comparing ...')
                result = 'Same';
        }
        else
        {
            result = 'Different';
            console.log('i = ' + i + ': ' + original_filecontent.charAt(i) + ' / ' + basecontent.charAt(i));
        }
    }
    console.log('Files are: ' + result);
}

//This function will download the current page content from GitHub and will place it into the WordPress Editor
function download_file_from_github(){

    //Status bar element
    var status_line = document.getElementById('save-to-github-status');
    status_line.innerHTML = '<span>Status: Connecting ...</span>';

    //Prepare variables for the API request
    var branch = document.getElementById('branch_in_repository').value;
    var filename = get_path_and_file_name(); //for example "test2/firstfile.txt" (include also the relative path)
    var contents_url = document.getElementById('api_url_to_repository').value; //for example https://api.github.com/repos/FEDEVEL/wordpress-web
    var github_token = document.getElementById('github_token').value; //token needed for login to github

    var apiurl = contents_url + '/contents/'+ filename +'?ref='+ branch; //path to the file
    var filedata = '';

    //Send the request to GitHub
    jQuery.ajax({
        url: apiurl,
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "token " + github_token);
        },
        data: filedata

    }).done(function (response) {
        //We have the file info and content

        //We are going to replace the content in editor
        var basecontent = b64DecodeUnicode(response.content); //we have to change the received file content back from base64

        var original_filecontent = document.getElementById('content'); //get content element
        original_filecontent.value = basecontent; //update the content element
        //console.log(basecontent); //show content of the file

        github_update_file_info(); //update the info about file

    }).fail(function (response) {
        status_line.innerHTML = '<span style="color: red">Status: Error. Could not be downloaded.</span>';
    });

}

//check if file exists on github, get its latest commit info
function github_update_file_info(){

    //get the original file content as soon as possible
    var original_filecontent = document.getElementById('content').value;

    //Status bar element
    var status_line = document.getElementById('save-to-github-status');
    status_line.innerHTML = '<span>Status: Connecting ...</span>';

    //File info elements
    var github_file_exists_info = document.getElementById('github_file_exists_info');
    var github_file_updated_info = document.getElementById('github_file_updated_info');
    var github_file_difference_info = document.getElementById('github_file_difference_info');

    //Prepare variables for the API request
    var branch = document.getElementById('branch_in_repository').value;
    var filename = get_path_and_file_name(); //for example "test2/firstfile.txt" (include also the relative path)
    var contents_url = document.getElementById('api_url_to_repository').value; //for example https://api.github.com/repos/FEDEVEL/wordpress-web
    var apiurl = contents_url + '/commits?sha=' + branch + '&path=' + filename; //this is the url to get commits for specific file
    var github_token = document.getElementById('github_token').value; //token needed for login to github

    //Prepare the data specific for this request
    var filedata = ''; //to get commits, we do not need to pass any special filedata

    //Send the request to GitHub
    jQuery.ajax({
        url: apiurl,
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "token " + github_token);
        },
        data: filedata

    }).done(function (response) {
        //console.log(response);

        if (!((response === null) || (response.length === 0))) //If response is empty, then the file doesn't exists
        {
            //File exists

            //enable download button
            var download_from_github = document.getElementById('download-from-github');
            download_from_github.classList.remove('disabled');

            //We are going to show the date of latest commit on the web. To do so, the date received from github has to be adjusted and re-formatted
            var commit_date = response[0].commit.committer.date; //get the commit date from response
            var d = new Date(commit_date);
            var options = {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'};
            github_file_updated_info.innerHTML = 'Last updated: <span style="font-style: italic">' + d.toLocaleString('en-US', options) + '</span>'; //show the date

            //Now, let's compare the local file with the one on github
            //First we need to get the file
            // Note: Maybe the comparision can be done through SHA, but I could not find a quick way how Github calculates it, so we will compare the content of files manually
            var apiurl = contents_url + '/contents/'+ filename +'?ref='+ branch; //path to the file
            var filedata = '{"ref":"' + branch + '"}';

            //Send the request to GitHub
            jQuery.ajax({
                url: apiurl,
                type: 'GET',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", "token " + github_token);
                },
                data: filedata
            }).done(function (response) {
                //We have the file info and content
                //console.log(response);
                github_file_exists_info.innerHTML = 'File info: <span style="font-style: italic">Exists on GitHub. Located <a href="'+ response.html_url + '" target="_blank">here</a></span>'; //Show the link to the file

                //We are going to compare the files
                var basecontent = b64DecodeUnicode(response.content); //we have to change the received file content back from base64
                //console.log(basecontent); //show content of the file
                github_file_difference_info.innerHTML = 'Difference: <span style="font-style: italic;color: dodgerblue;">Comparing ...</span>';

                compare_two_text_files(original_filecontent,basecontent); //function for debugging

                if (basecontent.localeCompare(original_filecontent)===0) //compare the received file with the content in the wordpress editor
                    github_file_difference_info.innerHTML = 'Difference: <span style="font-style: italic;color: dodgerblue;">Same</span> (<span onclick="github_update_file_info()" style="text-decoration: underline;font-style: italic;cursor: pointer;font-size: 10px">Click to refresh</span>)'; //The files are same
                else
                    github_file_difference_info.innerHTML = 'Difference: <span style="font-style: italic;color: red;">Different</span> (<span onclick="github_update_file_info()" style="text-decoration: underline;font-style: italic;cursor: pointer;font-size: 10px">Click to refresh</span>)'; //The files are different

                status_line.innerHTML = '<span>Status: Ready</span>';

            }).fail(function (response) {
                github_file_exists_info.innerHTML = 'File info: <span style="font-style: italic">Exists on GitHub.</span>';
                status_line.innerHTML = '<span style="color: red">Status: Error. Files could not be compared</span>';
            });

        }
        else
        {
            //The file doesn't exists
            github_file_exists_info.innerHTML = 'File info: <span style="font-style: italic">Not found on GitHub</span>';
            github_file_updated_info.innerHTML = 'Last updated: <span style="font-style: italic">Never</span>';
            github_file_difference_info.innerHTML = 'Difference: N/A';
            status_line.innerHTML = '<span>Status: Ready</span>';
        }

    }).fail(function (response) {
        //We have got answer from github
        //console.log(response);
        if(response.status === 404)
        {
            //The file doesn't exists
            github_file_exists_info.innerHTML = 'File info: <span style="font-style: italic">File not found</span>';
            github_file_updated_info.innerHTML = 'Last updated: <span style="font-style: italic">Never</span>';
            github_file_difference_info.innerHTML = 'Difference: N/A';
            status_line.innerHTML = '<span>Status: Ready</span>';
        }
        else if (response.status === 409){
            //Repository is empty
            github_file_exists_info.innerHTML = 'File info: <span style="font-style: italic">File not found</span>';
            github_file_updated_info.innerHTML = 'Last updated: <span style="font-style: italic">Never</span>';
            github_file_difference_info.innerHTML = 'Difference: N/A';
            status_line.innerHTML = '<span>Status: Ready. (Empty repository)</span>';
        }
        else {
            //Something went wrong
            github_file_exists_info.innerHTML = 'File info: <span style="font-style: italic;">Connection problem</span>';
            github_file_updated_info.innerHTML = 'Last updated: <span style="font-style: italic">Connection problem</span>';
            github_file_difference_info.innerHTML = 'Difference: N/A';
            status_line.innerHTML = '<span style="color:red">Status: Error! GitHub has returned an error.</span>';
        }

    });
}

//The repository URL has to be converted to the API URL
//Example: https://github.com/FEDEVEL/wordpress-web/ -> https://api.github.com/repos/FEDEVEL/wordpress-web
function get_path_and_file_name(){
    var web_base_url = document.getElementById('web-base-url-for-github').value;
    var span_web_url_to_the_file = document.getElementById('view-post-btn').innerHTML;
    var tmp = span_web_url_to_the_file.split('"');
    var web_url_to_the_file = tmp[1];
    //console.log('web_base_url: ' + web_base_url);
    //console.log('web_url_to_the_file: ' + web_url_to_the_file);
    var path_to_the_file = web_url_to_the_file.replace(web_base_url, ""); //remove base from the url
    path_to_the_file = path_to_the_file.slice(0, path_to_the_file.length-1); //last character. This is /

    if (web_base_url.localeCompare(web_url_to_the_file)===0)
        path_to_the_file = 'home_page.htm'; //This is the home page, a file directly placed on the web domain. Must have a unique name, so I used htm extension
    else
        path_to_the_file = path_to_the_file + '.html'; //Add an extension to the file. I chose HTML, as the syntax is highlighted in GitHub
    //console.log('path_to_the_file: ' + path_to_the_file);
    return (path_to_the_file);
}

//This will create or update a file on Github.
//First, we will check if the file exists. If it doesn't exists, we will create a new one. If it exists, we will update it.
function create_or_update_file_on_github() {

    //Status bar element
    var status_line = document.getElementById('save-to-github-status');
    status_line.innerHTML = '<span>Status: Connecting ...</span>';

    //File info elements
    var github_file_exists_info = document.getElementById('github_file_exists_info');
    var github_file_updated_info = document.getElementById('github_file_updated_info');
    var github_file_difference_info = document.getElementById('github_file_difference_info');

    //Format of the time stamp, this will be used later
    var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };

    //Prepare variables for the API request
    var branch = document.getElementById('branch_in_repository').value;
    var filename = get_path_and_file_name(); //for example "test2/firstfile.txt" (include also the relative path)
    var contents_url = document.getElementById('api_url_to_repository').value;
    var apiurl = contents_url + '/contents/'+ filename +'?ref='+ branch; //path to the file
    var github_token = document.getElementById('github_token').value;

    //For new commits, we will use the current user information, so we know who made the changes
    var name = document.getElementById('user_name_for_github').value;
    var email = document.getElementById('user_email_for_github').value;

    //Prepare the data specific for this request
    var filedata = '{"ref":"' + branch + '"}';

    //Send the request to GitHub
    jQuery.ajax({
        url: apiurl,
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "token " + github_token);
        },
        data: filedata

    }).done(function (response) {
        // The File exists
        //console.log(response);
        status_line.innerHTML = '<span>Status: File exists. Updating ...</span>';

        //prepare everything to update the file
        var filemessage = document.getElementById('commit-message-for-github').value;
        var filecontent = document.getElementById('content').value;
        var basecontent = b64EncodeUnicode(filecontent);

        //prepare the data needed to update a file
        filedata = '{"message":"' + filemessage + '","content":"' + basecontent + '","sha":"' + response.sha + '","branch":"' + branch + '","committer":{"name":"' + name + '","email":"' + email + '"}}';

        //Update the file
        jQuery.ajax({
            url: apiurl,
            type: 'PUT',
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", "token " + github_token);
            },
            data: filedata

        }).done(function (response) {
            //console.log(response);
            d = new Date(); //timestamp
            github_file_updated_info.innerHTML = 'Last updated: <span style="font-style: italic">' + d.toLocaleString('en-US',options) + '</span>';
            status_line.innerHTML = '<span>Status: OK. Updated. [' + d.toLocaleString('en-US',options) +']</span>';
        }).fail(function (response) {
            status_line.innerHTML = '<span style="color:red">Status: Error! Could not update the file.</span>';
        });

    }).fail(function (response) {
        //we have got answer from github
        //console.log(response);
        if(response.status === 404)
        {
            //404 = file doesn't exists
            status_line.innerHTML = "<span>Status: File doesn't exists. Creating ...</span>";

            //prepare everything to create a new file
            var filemessage = document.getElementById('commit-message-for-github').value;
            var filecontent = document.getElementById('content').value;
            var basecontent = b64EncodeUnicode(filecontent);

            //prepare the data needed to create a new file
            filedata = '{"message":"' + filemessage + '","content":"' + basecontent + '","branch":"' + branch + '","committer":{"name":"' + name + '","email":"' + email + '"}}';

            //create a new file
            jQuery.ajax({
                url: apiurl,
                type: 'PUT',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", "token " + github_token);
                },
                data: filedata

            }).done(function (response) {
                d = new Date(); //timestamp
                github_file_exists_info.innerHTML = 'File info: <span style="font-style: italic">This file exists on GitHub</span>';
                github_file_updated_info.innerHTML = 'Last updated: <span style="font-style: italic">' + d.toLocaleString('en-US',options) + '</span>';
                github_file_difference_info.innerHTML = 'Difference: <span style="font-style: italic;color: dodgerblue;">Same</span> (<span onclick="github_update_file_info()" style="text-decoration: underline;font-style: italic;cursor: pointer;font-size: 10px">Click to refresh</span>)'; //The files are same
                status_line.innerHTML = '<span>Status: OK. Created. [' + d.toLocaleString('en-US',options) +']</span>';
            }).fail(function (response) {
                status_line.innerHTML = '<span style="color:red">Status: Error! Could not create the file.</span>';
            });
        }
        else
        {
            //Something went wrong
            status_line.innerHTML = '<span style="color:red">Status: Error! GitHub has returned an error.</span>';
        }

    });
}