/**
 * Created by robotp on 28/05/2017.
 */
// Javascript to communicate with GitHub API

github_update_file_info(); //show the initial info about the file

function download_file_from_github(){

    //get the original file content as soon as possible
    var original_filecontent = document.getElementById('content');

    //Status bar element
    var status_line = document.getElementById('save-to-github-status');
    status_line.innerHTML = '<span>Status: Connecting ...</span>';

    //File info elements
    var github_file_difference_info = document.getElementById('github_file_difference_info');

    //Prepare variables for the API request
    var branch = "master";
    var filename = get_path_and_file_name(); //for example "test2/firstfile.txt" (include also the relative path)
    var contents_url = document.getElementById('api_url_to_repository').value; //for example https://api.github.com/repos/FEDEVEL/wordpress-web
    var github_token = document.getElementById('github_token').value; //token needed for login to github

    var apiurl = contents_url + '/contents/'+ filename; //path to the file
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

        //We are going to replace the content in editor
        var basecontent = atob(response.content); //we have to change the received file content back from base64
        original_filecontent.value = basecontent;
        //console.log(basecontent); //show content of the file

        github_update_file_info(); //update all the info

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
    var branch = "master";
    var filename = get_path_and_file_name(); //for example "test2/firstfile.txt" (include also the relative path)
    var contents_url = document.getElementById('api_url_to_repository').value; //for example https://api.github.com/repos/FEDEVEL/wordpress-web
    var apiurl = contents_url + '/commits?ref=' + branch + '&path=' + filename; //this is the url to get commits for specific file
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

        if (!((response === null) || (response.length === 0))) //if response is empty, then the file doesn't exists
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
            var apiurl = contents_url + '/contents/'+ filename; //path to the file
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
                var basecontent = atob(response.content); //we have to change the received file content back from base64
                //console.log(basecontent); //show content of the file
                github_file_difference_info.innerHTML = 'Difference: <span style="font-style: italic;color: dodgerblue;">Comparing ...</span>';

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
        //we have got answer from github
        //console.log(response);
        if(response.status === 404)
        {
            //The file doesn't exists
            github_file_exists_info.innerHTML = 'File info: <span style="font-style: italic">File not found</span>';
            github_file_updated_info.innerHTML = 'Last updated: <span style="font-style: italic">Never</span>';
            status_line.innerHTML = '<span>Status: Ready</span>';
        }
        else {
            //Something went wrong
            github_file_exists_info.innerHTML = 'File info: <span style="font-style: italic;">Connection problem</span>';
            github_file_updated_info.innerHTML = 'Last updated: <span style="font-style: italic">Connection problem</span>';
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
    var path_to_the_file = web_url_to_the_file.replace(web_base_url, ""); //remove base from the url
    path_to_the_file = path_to_the_file.slice(1, path_to_the_file.length-1); //remove first and last character. These are /
    path_to_the_file = path_to_the_file + '.html'; //Add an extension to the file. I chose HTML, as the syntax is highlighted in GitHub
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

    //Format of the time stamp, this will be used later
    var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };

    //Prepare variables for the API request
    var branch = "master";
    var filename = get_path_and_file_name(); //for example "test2/firstfile.txt" (include also the relative path)
    var contents_url = document.getElementById('api_url_to_repository').value;
    var apiurl = contents_url + '/contents/' + filename; // For example: 'https://api.github.com/repos/FEDEVEL/wordpress-test/contents/{+path}'; //path to the repository. Notice the "content" inside the url
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
        console.log(response);
        status_line.innerHTML = '<span>Status: File exists. Updating ...</span>';

        //prepare everything to update the file
        var filemessage = document.getElementById('commit-message-for-github').value;
        var filecontent = document.getElementById('content').value;
        var basecontent = btoa(filecontent);

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
            console.log(response);
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
            //The file doesn't exists, so we need to create a new one
            status_line.innerHTML = "<span>Status: File doesn't exists. Creating ...</span>";

            //prepare everything to create a new file
            var filemessage = document.getElementById('commit-message-for-github').value;
            var filecontent = document.getElementById('content').value;
            var basecontent = btoa(filecontent);

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