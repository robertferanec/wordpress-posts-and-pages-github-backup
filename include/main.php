<?php
    //This will tell WordPress to call "posts-and-pages-github-backup-menu" which will create a link to our Setting page in Admin menu
    add_action( 'admin_menu', 'posts_and_pages_github_backup_menu' );

    //This will add a link into Admin menu
    function posts_and_pages_github_backup_menu() {
        //add_menu_page ( page_title, menu_title, capability, __FILE__, function_which_we_call_to_create_our_TMP101_setting_page )
        add_menu_page('Posts and Pages GitHub Backup', 'Posts Backup', 'administrator', __FILE__, 'posts_and_pages_github_backup_admin_page');

        //this will help us to create variables for our plugin
        add_action( 'admin_init', 'posts_and_pages_github_backup_settings' );
    }

    //create a group of settings for out plugin
    function posts_and_pages_github_backup_settings() {
        register_setting( 'posts_and_pages_github_backup_settings_group', 'url_to_repository' );
        register_setting( 'posts_and_pages_github_backup_settings_group', 'github_token' );
        register_setting( 'posts_and_pages_github_backup_settings_group', 'branch_in_repository' );
    }

    //when this plugin is activated, set the variables into default values
    register_activation_hook( __FILE__, 'posts_and_pages_github_backup_set_default_options' );
    function posts_and_pages_github_backup_set_default_options(){
        update_option('url_to_repository', '');
        update_option('github_token', '');
        update_option('branch_in_repository', '');
    }

    //Here is the "HTML" code of our Admin Setting Page
    function posts_and_pages_github_backup_admin_page() {
        if ( !current_user_can( 'manage_options' ) )  {
        wp_die( __( 'You do not have sufficient permissions to access this page.' ) );
        }
        ?>
        <div class="wrap">
            <h2>Posts and Pages GitHub Backup - Setting page</h2>

            <form method="post" action="options.php">
                <?php
                settings_fields( 'posts_and_pages_github_backup_settings_group' );
                do_settings_sections( 'posts_and_pages_github_backup_settings_group' );
                $url_to_repository = esc_attr(get_option('url_to_repository'));
                $github_token = esc_attr(get_option('github_token'));
                $branch_in_repository = esc_attr(get_option('branch_in_repository'));
                ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">URL to your repository:</th>
                        <td>
                            <div>
                                <label class="screen-reader-text" for="url_to_repository">URL to your repository:</label>
                                <input type="text" id="url_to_repository" name="url_to_repository" value="<?php echo $url_to_repository; ?>" style='width:50em'>
                            </div>
                            <div style="font-size: 12px;font-style: italic;margin-left: 3px">For example: https://github.com/FEDEVEL/wordpress-website</div>
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Branch:</th>
                        <td>
                            <div>
                                <label class="screen-reader-text" for="branch_in_repository">Branch:</label>
                                <input type="text" id="branch_in_repository" name="branch_in_repository" value="<?php echo $branch_in_repository; ?>" style='width:50em'>
                            </div>
                            <div style="font-size: 12px;font-style: italic;margin-left: 3px">For example: master</div>
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Github token:</th>
                        <td>
                            <div>
                                <label class="screen-reader-text" for="github_token">GitHub token:</label>
                                <input type="password" id="github_token" name="github_token" value="<?php echo $github_token; ?>" style='width:40em'>
                            </div>
                            <div style="font-size: 12px;font-style: italic;margin-left: 3px">
                                To generate token, login to your github and go to <a href="https://github.com/settings/tokens" target="_blank">Personal access tokens</a>.<br>
                                Click on "Generate new token" button, check "repo" and press "Generate token".<br>
                                Your token is used as a password to access to your github. It is a 40 letter HEX number.
                            </div>
                        </td>
                    </tr>
                </table>
                <p><b>  Important:</b> Any change on GitHub takes couple of seconds or minutes to show up. This means, if you make a GitHub upload and<br>
                        you immediately update or refresh your edited post/page, status may still show, that the files are different. Wait a little bit,<br>
                        until GitHub registers the change and then use "Click to refresh" link located in the "Difference" status line.</p>
                <?php submit_button(); ?>

            </form>
        </div>
        <?php

    }

    // Add a custom meta box for per-post settings
    add_action('admin_menu', 'posts_and_pages_github_backup_add_custom_box');

    // Adds a panel into the right side of Post and Page edit screens
    function posts_and_pages_github_backup_add_custom_box() {
        //WP 2.5+
        if( function_exists( 'add_meta_box' )) {
            foreach( array('post', 'page') as $type ) {
            add_meta_box( 'posts_and_pages_github_backup_meta_box', 'Posts and Pages GitHub Backup', 'posts_and_pages_github_backup_meta_box', $type, 'side' );
            }
        }
    }

    /* Displays the custom box */
    function posts_and_pages_github_backup_meta_box(){

        //Include javascript
        $url = plugins_url('main.js', __FILE__);
        wp_enqueue_script('posts_and_pages_github_backup_script', $url, array('jquery'));

        //In the following steps we will prepare variables so we can use them in the javascript

        //get info about user
        global $current_user;
        get_currentuserinfo();

        //get info from the settings
        $url_to_repository = esc_attr(get_option('url_to_repository'));
        $tmp = explode("/",$url_to_repository,4); //we need to adjust the url for API, take out the USER_OR_COMPANY/REPOSITORY from the url
        $api_url_to_repository = 'https://api.github.com/repos/'.$tmp[3]; //This is how it should look: https://api.github.com/repos/USER_OR_COMPANY/REPOSITORY
        $github_token = esc_attr(get_option('github_token'));
        $branch_in_repository = esc_attr(get_option('branch_in_repository'));

        //store all the info in the hidden input elements
	$user_name_for_github = $current_user->user_firstname.' '.$current_user->user_lastname;
	if (strlen($user_name_for_github) < 2) //username must not be empty, github connection will fail
	    $user_name_for_github = $current_user->user_login; //if user didnt fill up first and last name in wordpress, use username
        echo '<input type="hidden" id="user_email_for_github" value="'.$current_user->user_email.'">';
        echo '<input type="hidden" id="user_name_for_github" value="'.$user_name_for_github.'">';
        echo '<input type="hidden" id="api_url_to_repository" value="'.$api_url_to_repository.'">';
        echo '<input type="hidden" id="github_token" value="'.$github_token.'">';
        echo '<input type="hidden" id="branch_in_repository" value="'.$branch_in_repository.'">';
        echo '<input type="hidden" id="web-base-url-for-github" value="'.get_home_url().'/">';

        //html code of the module
        echo '<div><span id="github_file_exists_info">File info: <span style="font-style: italic">Checking ...</span></span></div>';
        echo '<div><span id="github_file_updated_info">Last updated: <span style="font-style: italic">Checking ...</span></span></div>';

        echo '<div><span id="github_file_difference_info">Difference: <span style="font-style: italic">Checking ...</span></span></div>';

        echo '<p style="margin-top:15px; margin-left:2px;"><strong>Commit message (about changes):</strong></p>';
        echo '<label class="screen-reader-text" for="mit-message-for-github">Commit message:</label>';
        echo '<input id="commit-message-for-github" name="commit-message-for-github" type="text" placeholder="Your comment about the changes" style="width:99%;"><br>';
        echo '<div id="github-update-action" style="margin-top:15px;">';
        echo    '<span id="save-to-github" class="button button-primary button-large" onclick="create_or_update_file_on_github()">Upload to <img src="'.plugin_dir_url(__FILE__).'../images/GitHub-Mark-Light-32px.png" alt="Github" height="16"></span>';
        echo    '<span id="download-from-github" style="margin-left: 7px" class="button button-primary button-large disabled" onclick="download_file_from_github()">Download from <img src="'.plugin_dir_url(__FILE__).'../images/GitHub-Mark-Light-32px.png" alt="Github" height="16" ></span>';
        echo '</div>';
        echo '<div style="margin-top:15px; margin-left:2px; font-style: italic; font-size: 12px;"><span id="save-to-github-status">Status: Ready</span></div>';

    }
?>
