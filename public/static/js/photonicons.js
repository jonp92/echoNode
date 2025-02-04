const navElements = document.querySelectorAll('[content-id]');
const content = document.getElementById('content');


navElements.forEach((element) => {
    element.addEventListener('click', (event) => {
        const contentID = element.getAttribute('content-id');

    });
});

// Array of icon names
const iconNames = [
    'note', 'note-beamed', 'music', 'search', 'flashlight', 'mail', 'heart', 'heart-empty', 'star', 'star-empty',
    'user', 'users', 'user-add', 'video', 'picture', 'camera', 'layout', 'menu', 'check', 'cancel', 'cancel-circled',
    'cancel-squared', 'plus', 'plus-circled', 'plus-squared', 'minus', 'minus-circled', 'minus-squared', 'help',
    'help-circled', 'info', 'info-circled', 'back', 'home', 'link', 'attach', 'lock', 'lock-open', 'eye', 'tag',
    'bookmark', 'bookmarks', 'flag', 'thumbs-up', 'thumbs-down', 'download', 'upload', 'upload-cloud', 'reply',
    'reply-all', 'forward', 'quote', 'code', 'export', 'pencil', 'feather', 'print', 'retweet', 'keyboard', 'comment',
    'chat', 'bell', 'attention', 'alert', 'vcard', 'address', 'location', 'map', 'direction', 'compass', 'cup',
    'trash', 'doc', 'docs', 'doc-landscape', 'doc-text', 'doc-text-inv', 'newspaper', 'book-open', 'book', 'folder',
    'archive', 'box', 'rss', 'phone', 'cog', 'tools', 'share', 'shareable', 'basket', 'bag', 'calendar', 'login',
    'logout', 'mic', 'mute', 'sound', 'volume', 'clock', 'hourglass', 'lamp', 'light-down', 'light-up', 'adjust',
    'block', 'resize-full', 'resize-small', 'popup', 'publish', 'window', 'arrow-combo', 'down-circled', 'left-circled',
    'right-circled', 'up-circled', 'down-open', 'left-open', 'right-open', 'up-open', 'down-open-mini', 'left-open-mini',
    'right-open-mini', 'up-open-mini', 'down-open-big', 'left-open-big', 'right-open-big', 'up-open-big', 'down', 'left',
    'right', 'up', 'down-dir', 'left-dir', 'right-dir', 'up-dir', 'down-bold', 'left-bold', 'right-bold', 'up-bold',
    'down-thin', 'left-thin', 'right-thin', 'up-thin', 'ccw', 'cw', 'arrows-ccw', 'level-down', 'level-up', 'shuffle',
    'loop', 'switch', 'play', 'stop', 'pause', 'record', 'to-end', 'to-start', 'fast-forward', 'fast-backward',
    'progress-0', 'progress-1', 'progress-2', 'progress-3', 'target', 'palette', 'list', 'list-add', 'signal', 'trophy',
    'battery', 'back-in-time', 'monitor', 'mobile', 'network', 'cd', 'inbox', 'install', 'globe', 'cloud', 'cloud-thunder',
    'flash', 'moon', 'flight', 'paper-plane', 'leaf', 'lifebuoy', 'mouse', 'briefcase', 'suitcase', 'dot', 'dot-2',
    'dot-3', 'brush', 'magnet', 'infinity', 'erase', 'chart-pie', 'chart-line', 'chart-bar', 'chart-area', 'tape',
    'graduation-cap', 'language', 'ticket', 'water', 'droplet', 'air', 'credit-card', 'floppy', 'clipboard', 'megaphone',
    'database', 'drive', 'bucket', 'thermometer', 'key', 'flow-cascade', 'flow-branch', 'flow-tree', 'flow-line',
    'flow-parallel', 'rocket', 'gauge', 'traffic-cone', 'cc', 'cc-by', 'cc-nc', 'cc-nc-eu', 'cc-nc-jp', 'cc-sa', 'cc-nd',
    'cc-pd', 'cc-zero', 'cc-share', 'cc-remix', 'github', 'github-circled', 'flickr', 'flickr-circled', 'vimeo',
    'vimeo-circled', 'twitter', 'twitter-circled', 'facebook', 'facebook-circled', 'facebook-squared', 'gplus',
    'gplus-circled', 'pinterest', 'pinterest-circled', 'tumblr', 'tumblr-circled', 'linkedin', 'linkedin-circled',
    'dribbble', 'dribbble-circled', 'stumbleupon', 'stumbleupon-circled', 'lastfm', 'lastfm-circled', 'rdio',
    'rdio-circled', 'spotify', 'spotify-circled', 'qq', 'instagram', 'dropbox', 'evernote', 'flattr', 'skype',
    'skype-circled', 'renren', 'sina-weibo', 'paypal', 'picasa', 'soundcloud', 'mixi', 'behance', 'google-circles',
    'vkontakte', 'smashing', 'sweden', 'db-shape', 'logo-db'
];

// Create a container to hold the icons
const container = document.createElement('div');
container.id = 'icon-container';

// Iterate over the array and create span elements
iconNames.forEach((iconName) => {
    const span = document.createElement('span');
    span.className = `icon icon-${iconName}`;
    span.style.margin = '10px';
    span.style.fontSize = '2em';
    span.style.cursor = 'pointer';
    span.title = iconName;
    span.id = `icon-${iconName}`;
    container.appendChild(span);
});

// Append the container to the body or any other desired parent element
content.appendChild(container);