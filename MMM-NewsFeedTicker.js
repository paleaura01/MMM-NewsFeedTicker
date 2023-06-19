Module.register("MMM-NewsFeedTicker", {
    defaults: {
      feeds: [
        {
          title: "South Africa News 24",
          url: "http://feeds.news24.com/articles/news24/SouthAfrica/rss",
          customLogo: "news24.png"
        }
      ],
      showMarquee: true,
      showIcon: true,
      showSourceTitle: false,
      showPublishDate: false,
      showDescription: false,
      wrapTitle: false,
      wrapDescription: false,
      truncDescription: false,
      lengthDescription: 4000,
      hideLoading: false,
      reloadInterval: 60 * 60 * 1000, // every 60 minutes
      updateInterval: 60 * 1000, // every 60 seconds
      animationSpeed: 2 * 1000,
      maxNewsItems: 5, // 0 for unlimited
      ignoreOldItems: true,
      ignoreOlderThan: 2 * 24 * 60 * 60 * 1000, // 2 days
      removeStartTags: "both",
      removeEndTags: "both",
      startTags: [],
      endTags: [],
      prohibitedWords: [],
      scrollLength: "100%",
      logFeedWarnings: false,
      encoding: "UTF-8" //ISO-8859-1
    },
  
    requiresVersion: "2.1.0",
  
    start: function () {
      Log.info("Starting module: " + this.name);
      moment.locale(config.language);
      this.newsItems = [];
      this.loaded = false;
      this.activeItem = 0;
      this.scrollPosition = 0;
      this.registerFeeds();
    },
  
    socketNotificationReceived: function (notification, payload) {
      if (notification === "NEWS_ITEMS") {
        this.generateFeed(payload);
        if (!this.loaded) {
          this.scheduleUpdateInterval();
        }
        this.loaded = true;
      }
    },
  
    getDom: function () {
      var wrapper = document.createElement("div");
      if (this.config.feedUrl) {
        wrapper.className = "bold normal";
        wrapper.innerHTML =
          "The configuration options for the newsfeed module have changed.<br>Please check the documentation.";
        return wrapper;
      }
      if (this.activeItem >= this.newsItems.length) {
        this.activeItem = 0;
      }
      if (this.newsItems.length > 0) {
        if (
          !this.config.showFullArticle &&
          (this.config.showSourceTitle || this.config.showPublishDate)
        ) {
          var sourceAndTimestamp = document.createElement("div");
          if (
            this.config.showSourceTitle &&
            this.newsItems[this.activeItem].sourceTitle !== ""
          ) {
            sourceAndTimestamp.innerHTML =
              this.newsItems[this.activeItem].sourceTitle;
          }
          if (
            this.config.showSourceTitle &&
            this.newsItems[this.activeItem].sourceTitle !== "" &&
            this.config.showPublishDate
          ) {
            sourceAndTimestamp.innerHTML += " ";
          }
          if (this.config.showPublishDate) {
            sourceAndTimestamp.innerHTML += moment(
              new Date(this.newsItems[this.activeItem].pubdate)
            ).fromNow();
          }
          if (
            this.config.showSourceTitle &&
            this.newsItems[this.activeItem].sourceTitle !== "" ||
            this.config.showPublishDate
          ) {
            sourceAndTimestamp.innerHTML += ":";
          }
          wrapper.appendChild(sourceAndTimestamp);
        }
        if (
          this.config.removeStartTags == "title" ||
          this.config.removeStartTags == "both"
        ) {
          this.newsItems[this.activeItem].title = this.stripTags(
            this.newsItems[this.activeItem].title,
            this.config.startTags,
            this.config.endTags
          );
        }
        if (
          this.config.removeEndTags == "title" ||
          this.config.removeEndTags == "both"
        ) {
          this.newsItems[this.activeItem].title = this.stripTags(
            this.newsItems[this.activeItem].title,
            this.config.startTags,
            this.config.endTags
          );
        }
        var title = document.createElement("div");
        if (this.config.wrapTitle) {
          title.className = "small bright";
        } else {
          title.className = "medium bright";
        }
        title.innerHTML = this.newsItems[this.activeItem].title;
        wrapper.appendChild(title);
        if (this.config.showDescription) {
          var description = document.createElement("div");
          if (this.config.wrapDescription) {
            description.className = "xsmall";
          } else {
            description.className = "small";
          }
          if (this.config.truncDescription) {
            description.innerHTML = this.truncateDescription(
              this.newsItems[this.activeItem].description,
              this.config.lengthDescription
            );
          } else {
            description.innerHTML = this.newsItems[this.activeItem].description;
          }
          wrapper.appendChild(description);
        }
        if (this.config.showMarquee) {
          wrapper.className = "bright marquee";
          wrapper.style.animationDuration =
            (this.config.animationSpeed / 1000) * 2 + "s";
          wrapper.innerHTML +=
            "<div class='space'></div>" + wrapper.innerHTML;
        }
        if (this.config.showIcon) {
          var icon = document.createElement("img");
          icon.className = "symbol";
          if (this.newsItems[this.activeItem].customLogo !== undefined) {
            icon.src = this.newsItems[this.activeItem].customLogo;
          } else {
            icon.src = "/modules/MMM-NewsFeedTicker/public/news.png";
          }
          wrapper.insertBefore(icon, wrapper.firstChild);
        }
      } else {
        wrapper.innerHTML = this.translate("LOADING");
      }
      return wrapper;
    },
  
    registerFeeds: function () {
      for (var f in this.config.feeds) {
        var feed = this.config.feeds[f];
        if (feed.customLogo !== undefined)
          feed.customLogo = this.data.path + "pics/" + feed.customLogo;
        this.sendSocketNotification("ADD_FEED", {
          feed: feed,
          config: this.config
        });
      }
    },
  
    generateFeed: function (feeds) {
      if (!Array.isArray(feeds)) {
        Log.error("Newsfeed - Incorrect news format. Check your rss feed for typos.");
        return;
      }
      this.newsItems = [];
      for (var f in feeds) {
        var feed = feeds[f];
        for (var i = 0; i < feed.feedEntries.length; i++) {
          var entry = feed.feedEntries[i];
          var item = {
            title: entry.title,
            description: entry.description,
            pubdate: entry.pubdate,
            sourceTitle: feed.title,
            customLogo: feed.customLogo,
            url: entry.url
          };
          if (this.config.ignoreOldItems) {
            var pubdate = new Date(entry.pubdate);
            if (
              pubdate.getTime() <
              Date.now() - this.config.ignoreOlderThan
            ) {
              continue;
            }
          }
          if (this.config.maxNewsItems > 0) {
            if (this.newsItems.length >= this.config.maxNewsItems) {
              break;
            }
          }
          this.newsItems.push(item);
        }
      }
      this.updateDom(this.config.animationSpeed);
    },
  
    stripTags: function (str, startTags, endTags) {
      var regex =
        "<(?:" +
        startTags.join("|") +
        ")([^>]+)>(?:[\\S\\s]*?)<\/(?:" +
        endTags.join("|") +
        ")>";
      return str.replace(new RegExp(regex, "gi"), "");
    },
  
    truncateDescription: function (str, length) {
      if (str.length > length) {
        return str.substring(0, length) + "...";
      } else {
        return str;
      }
    },
  
    scheduleUpdateInterval: function () {
      var self = this;
      setInterval(function () {
        self.updateDom(self.config.animationSpeed);
      }, this.config.reloadInterval);
    }
  });