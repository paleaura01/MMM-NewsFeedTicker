for (let index = 0; index < array.length; index++) {
  const element = array[index];
  var FeedMe = require("feedme");
  var request = require("request");
  var iconv = require("iconv-lite");
  
  var Fetcher = function(url, reloadInterval, encoding, logFeedWarnings, defaultLogo) {
    var self = this;
    if (reloadInterval < 1000) {
      reloadInterval = 1000;
    }
  
    var reloadTimer = null;
    var items = [];
    var logo = defaultLogo;
  
    var fetchFailedCallback = function() {};
    var itemsReceivedCallback = function() {};
  
    var fetchNews = function() {
      clearTimeout(reloadTimer);
      reloadTimer = null;
      items = [];
  
      var parser = new FeedMe();
  
      parser.on("item", function(item) {
        var title = item.title;
        var description = item.description || item.summary || item.content || "";
        var pubdate = item.pubdate || item.published || item.updated || item["dc:date"];
        var url = item.url || item.link || "";
  
        if (title && pubdate) {
          var regex = /(<([^>]+)>)/ig;
          description = description.toString().replace(regex, "");
  
          items.push({
            title: title,
            description: description,
            pubdate: pubdate,
            url: url,
            logo: logo,
            enclosure: url
          });
        } else if (logFeedWarnings) {
          console.log("Can't parse feed item:");
          console.log(item);
          console.log("Title: " + title);
          console.log("Description: " + description);
          console.log("Pubdate: " + pubdate);
        }
      });
  
      parser.on("image", function(image) {
        if (image.url) {
          defaultLogo = image.url;
        } else if (logFeedWarnings) {
          console.log("Image parsing error.");
        }
      });
  
      parser.on("end", function() {
        self.broadcastItems();
        scheduleTimer();
      });
  
      parser.on("error", function(error) {
        fetchFailedCallback(self, error);
        scheduleTimer();
      });
  
      var nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1]);
      var headers = {
        "User-Agent": "Mozilla/5.0 (Node.js " + nodeVersion + ") MagicMirror/" + global.version + " (https://github.com/MichMich/MagicMirror/)",
        "Cache-Control": "max-age=0, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache"
      };
  
      request({ uri: url, encoding: null, headers: headers })
        .on("error", function(error) {
          fetchFailedCallback(self, error);
          scheduleTimer();
        })
        .pipe(iconv.decodeStream(encoding))
        .pipe(parser);
    };
  
    var scheduleTimer = function() {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(function() {
        fetchNews();
      }, reloadInterval);
    };
  
    this.setReloadInterval = function(interval) {
      if (interval > 1000 && interval < reloadInterval) {
        reloadInterval = interval;
      }
    };
  
    this.startFetch = function() {
      fetchNews();
    };
  
    this.broadcastItems = function() {
      if (items.length <= 0) {
        return;
      }
      itemsReceivedCallback(self);
    };
  
    this.onReceive = function(callback) {
      itemsReceivedCallback = callback;
    };
  
    this.onError = function(callback) {
      fetchFailedCallback = callback;
    };
  
    this.url = function() {
      return url;
    };
  
    this.logo = function() {
      return logo;
    };
  
    this.items = function() {
      return items;
    };
  };
  
  module.exports = Fetcher;
  
}