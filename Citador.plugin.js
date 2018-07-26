//META{"name":"Citador"}*//

/* global $, PluginUtilities, PluginTooltip, ReactUtilities, InternalUtilities, PluginContextMenu, PluginSettings, Element */

class Citador {

  constructor() {
    this.downloadJSON("https://rawgit.com/nirewen/Citador/master/Citador.locales.json").then((json) => {
      this.strings = json;
    })
  }
  
  /** LOCALE **/
  
  get local() {
    if (this.strings)
      return this.strings[document.documentElement.getAttribute('lang').split('-')[0]] || this.strings.en;
    else
      return {};
  }
  
  /** BD FUNCTIONS **/
  
  getName         () { return "Citador";            }
  getDescription  () { return this.local.description}
  getVersion      () { return "1.7.8";              }
  getAuthor       () { return "Nirewen";            }
  unload          () { this.deleteEverything();     }
  stop            () { this.deleteEverything();     }
  load            () {                              }
  async start     () {
    let libraryScript = this.inject('script', {
      type: 'text/javascript',
      id: 'zeresLibraryScript',
      src: 'https://rauenzi.github.io/BetterDiscordAddons/Plugins/PluginLibrary.js'
    });
    this.inject('link', {
      type: 'text/css',
      id: 'citador-css',
      rel: 'stylesheet',
      href: 'https://rawgit.com/nirewen/Citador/master/Citador.styles.css?v=2'
    });

    if (!this.strings) 
      this.strings = await this.downloadJSON("https://rawgit.com/nirewen/Citador/master/Citador.locales.json");

    if (typeof window.ZeresLibrary !== "undefined") 
      this.initialize();
    else 
      libraryScript.addEventListener("load", () => this.initialize());
  }
  
  initialize() {
    let self = this;
    PluginUtilities.checkForUpdate(this.getName(), this.getVersion(), "https://raw.githubusercontent.com/nirewen/Citador/master/Citador.plugin.js");
    PluginUtilities.showToast(`${this.getName()} ${this.getVersion()} ${this.local.startMsg.toLowerCase()}`);
    this.switchObserver    = PluginUtilities.createSwitchObserver(this);
    this.MessageParser     = InternalUtilities.WebpackModules.findByUniqueProperties(["createBotMessage"]);
    this.MessageQueue      = InternalUtilities.WebpackModules.findByUniqueProperties(["enqueue"]);
    this.MessageController = InternalUtilities.WebpackModules.findByUniqueProperties(["sendClydeError"]);
    this.EventDispatcher   = InternalUtilities.WebpackModules.findByUniqueProperties(["dispatch"]);
    this.MainDiscord       = InternalUtilities.WebpackModules.findByUniqueProperties(["ActionTypes"]);
    this.HistoryUtils      = InternalUtilities.WebpackModules.findByUniqueProperties(['transitionTo', 'replaceWith', 'getHistory']);
    this.moment            = InternalUtilities.WebpackModules.findByUniqueProperties(['parseZone']);
    this.initialized       = true;
    this.quoteURL          = 'https://github.com/nirewen/Citador?';
    this.CDN_URL           = 'https://cdn.discordapp.com/avatars/';
    this.ASSETS_URL        = 'https://discordapp.com';
  
    /* 
      Forcing guilds to be blocked in Citador.
      
      * You shall not change this unless you 
        want to be banned from these servers 
        (or from Discord)
        
      CONTRIBUTORS: 
      - To add more Discord Official servers IDs to this list
      * Currently in the list:
        - BetterDiscord²
        - BetterDiscord
        - Discord API
        - Discord Testers
        - Discord HypeSquad
        - Discord Developers
        - Discord Events
        - Discord Feedback
        - Discord Game Night
    */
    this.forcedGuilds = ['280806472928198656', '86004744966914048', '81384788765712384', '197038439483310086', '200661830648070145', '41771983423143937', '169256939211980800', '268811439588900865', '200445132191825920'];
  
    this.loadSettings();
    this.patchExternalLinks();
    
    $(document).on("mouseover.citador", function(e) {
      let target = $(e.target),
        classes = {
          close_button: 'prepend',
          group: 'container-1YxwTf',
          message: 'message-1PNnaP',
          content: 'content-3dzVd8',
          markup: 'markup-2BOw-j',
          avatar: 'avatar-17mtNa .image-33JSyf',
          username: 'username-_4ZSMR',
          compact: 'containerCompact-3V0ioj',
          accessory: 'container-1e22Ot',
          embed: 'embed-IeVjo6',
          time: 'time:not(.edited-DL9ECl)',
          edited: 'edited-DL9ECl',
          option: 'buttonContainer-37UsAw .button-3Jq0g9',
          mentionHighlight: 'isMentioned-N-h9aa',
          mentionHighlightBar: 'isMentionedCozy-3isp7y'
        };
      
      if (target.parents(`.${classes.message}`).length > 0) {
        $(`.messages .${classes.group}`)
          .on('mouseover', function() {
            if ($(this).find('.citar-btn').length == 0) {
              $(`.messages .${classes.group}`).hasClass(classes.compact) 
                ? $(this).find(classes.time).first().prepend('<span class="citar-btn"></span>') 
                : $(this).find(classes.time).append('<span class="citar-btn"></span>');
                
              new PluginTooltip.Tooltip($(this).find('.citar-btn'), self.local.quoteTooltip);
              $(this).find('.citar-btn')
                .on('mousedown.citador', () => false)
                .click(function() {
                  self.attachParser();
                  
                  let message = $(this).parents(`.${classes.group}`);
                  
                  self.quoteProps = $.extend(true, {}, ReactUtilities.getOwnerInstance(message[0]).props);
                  self.handleSelection(message[0], classes);
                  
                  this.createQuote = function() {
                    var messageElem = $(message).clone().hide().appendTo(".quote-msg");
                    self.quoteMsg = $(".quote-msg");
                    
                    $('.quote-msg').find('.citar-btn').toggleClass('hidden');
                    
                    $('.quote-msg').find(`.${classes.embed}`).each(function() {
                      $(this).closest(`.${classes.accessory}`).remove();
                    });
                    
                    if (self.selectedMessages) {
                      $('.quote-msg').find(`.${classes.mentionHighlight}`).removeClass(`${classes.mentionHighlight} ${classes.mentionHighlightBar}`)
                      $('.quote-msg').find(`.${classes.markup}`).each(function(i) {
                        if (self.selectedMessages[i]) {
                          $(this).html(self.selectedMessages.htmls[i]);
                        } else {
                          $(`.quote-msg .${classes.message}`).has(this).remove();
                        }
                      })
                    }
                    
                    $('.quote-msg').find(`.${classes.markup}`).each(function() {
                      let index = $(`.quote-msg .${classes.message}`).index($(`.quote-msg .${classes.message}`).has(this));
                      if (0 === self.quoteProps.messages[index].content.length + $(this).closest(`.${classes.message}`).find(`.${classes.accessory}`).length) {
                        self.removeQuoteAtIndex(index);
                      }
                    });

                    $('.quote-msg').find(`.${classes.markup}`).before('<div class="delete-msg-btn"></div>');
                    $('.quote-msg').find(`.${classes.edited}, .${classes.option}, .btn-reaction`).remove();
                    
                    $(`.quote-msg .${classes.group}`)[classes.close_button]('<div class="quote-close"></div>');
                    $('.quote-msg').find('.quote-close').click(() => self.cancelQuote());
                    
                    // define a função de clique, pra deletar uma mensagem que você não deseja citar
                    $('.quote-msg').find('.delete-msg-btn')
                      .click(function() {
                        self.removeQuoteAtIndex($(`.quote-msg .${classes.message}`).index($(`.quote-msg .${classes.message}`).has(this)));
                      })
                      .each(function() {
                        new PluginTooltip.Tooltip($(this), self.local.deleteTooltip);
                      });
                      
                    ($(`.messages .${classes.group}`).hasClass(classes.compact) 
                      ? $('.quote-msg').find(`.${classes.username}`)
                      : $('.quote-msg').find(`.${classes.avatar}`))
                      .click(function () {self.attachMention(self.quoteProps.messages[0].author)});
                    
                    if (self.settings.mentionUser) {
                      self.attachMention(self.quoteProps.messages[0].author);
                    }

                    $('.quote-msg').find(`.${classes.message}`)
                      .on('mouseover.citador', function() {
                        $(this).find('.delete-msg-btn').fadeTo(5, 0.4);
                      })
                      .on('mouseout.citador', function() {
                        $(this).find('.delete-msg-btn').fadeTo(5, 0);
                      });                 
                    
                    if (!self.canChat()) {
                      $('.quote-msg').find('.citar-btn.hidden:not(.cant-embed)').toggleClass('hidden cant-embed');
                      new PluginTooltip.Tooltip($('.quote-msg').find('.citar-btn'), self.local.noChatTooltip, 'red');
                    }
                    else if (!self.canEmbed() && self.settings.useFallbackCodeblock == 0) {
                      $('.quote-msg').find('.citar-btn.hidden:not(.cant-embed)').toggleClass('hidden cant-embed');
                      new PluginTooltip.Tooltip($('.quote-msg').find('.citar-btn'), self.local.noPermTooltip, 'red');
                    }
                    
                    messageElem.slideDown(150);
                  };
                  
                  if ($(`.quote-msg .${classes.group}`).length > 0)
                    $(`.quote-msg .${classes.group}`).remove();
                  else
                    $('.channelTextArea-1LDbYG').prepend('<div class="quote-msg"></div>');
                  
                  this.createQuote();
                  $('.channelTextArea-1LDbYG').focus();
                });
            }
          })
          .on('mouseleave',function() {
            if ($(this).find('.citar-btn').length == 1)
              $(this).find('.citar-btn').empty().remove();
          });
      }
    });
    this.log(this.local.startMsg, "info");
  }
  
  onChannelSwitch () {
    if (this.quoteProps) {
      this.attachParser();
      
      $('.channelTextArea-1LDbYG').prepend(this.quoteMsg);
      
      if (!this.canChat()) {
        $('.quote-msg').find('.citar-btn.hidden:not(.cant-embed)').toggleClass('hidden cant-embed');
        new PluginTooltip.Tooltip($('.quote-msg').find('.citar-btn'), this.local.noChatTooltip, 'red');
      }
      else if (!this.canEmbed() && this.settings.useFallbackCodeblock == 0) {
        $('.quote-msg').find('.citar-btn.hidden:not(.cant-embed)').toggleClass('hidden cant-embed');
        new PluginTooltip.Tooltip($('.quote-msg').find('.citar-btn'), this.local.noPermTooltip, 'red');
      } else
        $('.quote-msg').find('.citar-btn:not(.hidden).cant-embed').toggleClass('hidden cant-embed');
    }
  }
  
  getSettingsPanel() {
    let panel = $("<form>").addClass("form citador").css("width", "100%");
    if (this.initialized) this.generateSettings(panel);
    return panel[0];
  }
  
  attachParser() {
    var el = $('.channelTextArea-1LDbYG');
    if (el.length == 0) return;
    
    const handleKeypress = (e) => {
      var code = e.keyCode || e.which;
      if (code !== 13) return;
      
      try {
        if (this.settings.useFallbackCodeblock == 1 
            || !this.canEmbed() && this.settings.useFallbackCodeblock == 2 
            || this.settings.disabledServers.includes(PluginUtilities.getCurrentServer() 
                ? PluginUtilities.getCurrentServer().id 
                : null)
            || this.forcedGuilds.includes(PluginUtilities.getCurrentServer() 
                ? PluginUtilities.getCurrentServer().id 
                : null))
          this.sendTextQuote(e);
        else
          this.sendEmbedQuote(e);
      } catch (e) {
        this.log(e, "warn");
      }
    };
    
    el[0].addEventListener("keydown", handleKeypress, false);
    el[0].addEventListener("keyup", (e) => {
      if (e.keyCode == 27 && this.quoteProps) this.cancelQuote();
    }, false);
  }
  
  attachMention(user) {
    if (!$('form')[0]) return;
    ReactUtilities.getOwnerInstance($('form')[0]).setState({
      textValue: ReactUtilities.getOwnerInstance($('form')[0]).state.textValue + `@${user.username}#${user.discriminator} `
    });
  }
  
  sendEmbedQuote(e) {
    var props = this.quoteProps;
    if (props) {
      if (e.shiftKey || $('.autocomplete-1vrmpx').length >= 1) return;
    
      var messages  = props.messages.filter(m => !m.deleted),
          guilds    = this.guilds,
          msg       = props.messages[0],
          cc        = ReactUtilities.getOwnerInstance($("form")[0]).props.channel,
          msgC      = props.channel,
          msgG      = guilds.filter(g => g.id == msgC.guild_id)[0],
          
          author    = msg.author,
          avatarURL = author.getAvatarURL(),
          color     = parseInt(msg.colorString ? msg.colorString.slice(1) : 'ffffff', 16),
          msgCnt    = this.MessageParser.parse(cc, $('.channelTextArea-1LDbYG textarea').val()),
          text      = messages.map(m => m.content).join('\n'),
          atServer  = msgC.guild_id && msgC.guild_id != cc.guild_id ? ` at ${msgG.name}` : '',
          chName    = msgC.isDM() ? `@${msgC._getUsers()[0].username}` : msgC.isGroupDM() ? `${msgC.name}` : `#${msgC.name}`;
          
      if (this.selectedMessages) {
        text = this.selectedMessages.join('\n');
      }
      
      let embed = {
          author: {
            name: msg.nick || author.username,
            icon_url: avatarURL.startsWith(this.CDN_URL) ? avatarURL : `${this.ASSETS_URL}${avatarURL}`,
            url: `${this.quoteURL}${msgG ? `guild_id=${msgG.id}&` : ''}channel_id=${msgC.id}&message_id=${msg.id}`,
          },
          description: text,
          footer: {
            text: `in ${chName}${atServer}`
          },
          color,
          timestamp: msg.timestamp.toISOString(),
        },
        attachments = messages.map(m => m.attachments).reduce((a, b) => a.concat(b));
            
      if (attachments.length >= 1) {
        var imgAt = attachments.filter(a => a.width);
        if(imgAt.length >= 1)
          embed.image = {url: attachments[0].url};
        
        var otherAt = attachments.filter(a => !a.width);
        if (otherAt.length >= 1) {
          embed.fields = [];
          otherAt.forEach((at, i) => {
            var emoji = '📁';
            if (/(.apk|.appx|.pkg|.deb)$/.test(at.filename)) emoji = '📦';
            if (/(.jpg|.png|.gif)$/.test(at.filename)) emoji = '🖼';
            if (/(.zip|.rar|.tar.gz)$/.test(at.filename)) emoji = '📚';
            if (/(.txt)$/.test(at.filename)) emoji = '📄';
            
            embed.fields.push({name: `${this.local.attachment} #${i+1}`, value: `${emoji} [${at.filename}](${at.url})`});
          });
        }
      }
      
      let message = this.MessageParser.createMessage(cc.id, msgCnt.content);
      
      this.MessageQueue.enqueue({
        type: "send",
        message: {
          channelId: cc.id,
          content: msgCnt.content,
          tts: false,
          nonce: message.id,
          embed
        }
      }, r => {
        r.ok ? (this.MessageController.receiveMessage(cc.id, r.body)) : (r.status >= 400 && r.status < 500 && r.body && this.MessageController.sendClydeError(cc.id, r.body.code),
        this.EventDispatcher.dispatch({
          type: this.MainDiscord.ActionTypes.MESSAGE_SEND_FAILED,
          messageId: msg.id,
          channelId: cc.id
        }));
      });
          
      ReactUtilities.getOwnerInstance($('form')[0]).setState({textValue: ''});
    
      this.cancelQuote();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }
  
  sendTextQuote(e) {
    var props = this.quoteProps;
    if (props) {
      if (e.shiftKey || $('.autocomplete-1TnWNR').length >= 1) return;
    
      var messages  = props.messages.filter(m => !m.deleted),
          guilds    = this.guilds,
          msg      = props.messages[0],
          cc        = ReactUtilities.getOwnerInstance($("form")[0]).props.channel,
          msgC      = props.channel,
          msgG      = guilds.filter(g => g.id == msgC.guild_id)[0],
          author    = msg.author,
          content   = this.MessageParser.parse(cc, $('.channelTextArea-1LDbYG textarea').val()).content,
          text      = messages.map(m => m.content).join('\n'),
          atServer  = msgC.guild_id && msgC.guild_id != cc.guild_id ? ` at ${msgG.name}` : '',
          chName    = msgC.isDM() ? `@${msgC._getUsers()[0].username}` : msgC.isGroupDM() ? `${msgC.name}` : `#${msgC.name}`;
          
      if (this.selectedMessages) {
        text = this.selectedMessages.join('\n');
      }
      
      const format = 'DD-MM-YYYY HH:mm';
      content     += `\n${'```'}\n${this.MessageParser.unparse(text, cc.id).replace(/\n?(```((\w+)?\n)?)+/g, '\n').trim()}\n${'```'}`;
      content     += `\`${msg.nick || author.username} - ${this.moment(msg.timestamp).format(format)} | ${chName}${atServer}\``;
      content      = content.trim();
          
      this.MessageController.sendMessage(cc.id, { content });
          
      ReactUtilities.getOwnerInstance($('form')[0]).setState({textValue: ''});
    
      this.cancelQuote();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }
  
  patchExternalLinks() {
    let LinkComponent = InternalUtilities.WebpackModules.find(InternalUtilities.Filters.byCode(/trusted/));
    this.cancel = InternalUtilities.monkeyPatch(LinkComponent.prototype, "render", {before: ({thisObject}) => {
        if (thisObject.props.href.startsWith(this.quoteURL)) {
          thisObject.props.trusted = true;
            thisObject.props.onClick = (e) => {
                e.preventDefault();
                const querystring = require('querystring');
                const {guild_id, channel_id, message_id} = querystring.parse(thisObject.props.href.substring(this.quoteURL.length));
                if (!guild_id || this.guilds.find(g => g.id == guild_id))
                  this.HistoryUtils.transitionTo(this.MainDiscord.Routes.MESSAGE(guild_id, channel_id, message_id));
                else
                  ReactUtilities.getOwnerInstance($('.app')[0]).shake();
            };
        }
    }});
  }
  
  removeQuoteAtIndex(i) {
    let classes = {
      canary: {
        message: 'message-1PNnaP',
        message_text: 'content-3dzVd8',
        accessory: 'container-1e22Ot'
      },
      stable: {
        message: 'message',
        message_text: 'message-text',
        accessory: 'accessory'
      }
    }[DiscordNative.globals.releaseChannel];
    
    if (this.quoteProps) {
      if (this.quoteProps.messages.filter(m => !m.deleted).length < 2)
        this.cancelQuote();
      else {
        let deleteMsg = $($(`.quote-msg .${classes.message}`)[i]);                
        deleteMsg.find(`.${classes.message_text}, .${classes.accessory}`).hide();
        this.quoteProps.messages[i].deleted = true;
      }
    } else
      this.cancelQuote();
  }
  
  cancelQuote() {
    $('.quote-msg').slideUp(300, () => $('.quote-msg').remove());
    this.quoteMsg   = null;
    this.quoteProps.messages.forEach(m => m.deleted = null);
    this.quoteProps = null;
    this.selectedMessages = null;
  }
  
  observer(e) {
    if (!e.addedNodes.length || !(e.addedNodes[0] instanceof Element) || !e.addedNodes[0].classList) return;
    let elem  = e.addedNodes[0],
      context = elem.classList.contains('contextMenu-uoJTbz') ? elem : elem.querySelector('.contextMenu-uoJTbz');
    if (!context) return;
    
    let {guild, target} = ReactUtilities.getReactProperty(context, "return.memoizedProps");
    
    if (!guild || target.className !== "avatar-small") return;
    
    let {id} = guild;
    if (this.forcedGuilds.includes(id)) return;
    $(context).find('.item-1XYaYf').first().after(
      $(new PluginContextMenu.ToggleItem(this.local.settings.disableServers.context, !this.settings.disabledServers.includes(id), {
        callback: e => {
          if (this.settings.disabledServers.includes(id))
            this.settings.disabledServers.splice(this.settings.disabledServers.indexOf(id), 1);
          else
            this.settings.disabledServers.push(id);
          this.saveSettings();
        }
      }).getElement())
    );
  }
  
  /** UTILS **/
  
  downloadJSON(url) {
    return new Promise((resolve, reject) => {
      require("request")(url, (err, resp, body) => {
        if (err) reject(err);
        try {
          resolve(JSON.parse(body));
        }
        catch (err) {
          reject(err);
        }
      });
    });
  }

  getSelectedTextWithin(el) {
    let validRange = null;
    let sel = window.getSelection();
    if (sel.rangeCount > 0) {
      let range = document.createRange();
      range.selectNodeContents(el);
      var selRange = sel.getRangeAt(0);
      if (selRange.compareBoundaryPoints(range.START_TO_END, range) == 1 && selRange.compareBoundaryPoints(range.END_TO_START, range) == -1) {
        if (selRange.compareBoundaryPoints(range.START_TO_START, range) == 1) {
          range.setStart(selRange.startContainer, selRange.startOffset);
        }
        if (selRange.compareBoundaryPoints(range.END_TO_END, range) == -1) {
          range.setEnd(selRange.endContainer, selRange.endOffset);
        }
        validRange = range;
      }
    }
    return validRange;
  }

  // Doesn't support markup and etc.
  oldHandleSelection(messageGroup, classes) {
    let selection = this.getSelectedTextWithin(messageGroup);
    if (selection) {
      let messages = [];
      let selectionContents = $(selection.cloneContents()).contents();
      let selectionMarkups = selectionContents.find(`.${classes.markup}`);
      if (selectionMarkups.length > 0) {
        selectionMarkups.each(function() {
          messages.push($(this).text());
        });
      } else {
        messages.push(selectionContents.text());
      }
      
      messages = messages.map(m => m.trim())
      if (messages && messages.length > 0 && messages.some(m => !!m)) {
        this.selectedMessages = messages;
      }
    }
  }

  handleSelection(messageGroup, classes) {
    function parseHTML (contents) {
      let sameMessage = [];
      contents.each(function() {
        if (this.nodeType === 3) {
          sameMessage.push($(this).text());
        } else {
          switch (this.nodeName) {
            case 'STRONG':
              sameMessage.push(`**${parseHTML($(this).contents())}**`);
              break;
            case 'U':
              sameMessage.push(`__${parseHTML($(this).contents())}__`);
              break;
            case 'SPAN':
              sameMessage.push('@MENTION');
              break;
            case 'PRE':
              let code = this.className.split(/\s+/).find(c => c.startsWith('hl')) || '';
              console.log(code)
              sameMessage.push('```' + code.substring(2) + '\n' + $(this).text() + '```');
              break;
          }
        }
      })
      return sameMessage.join('')
    }

    let selection = this.getSelectedTextWithin(messageGroup);
    if (selection) {
      let messages = [];
      let selectionFragment = $(selection.cloneContents())
      let selectionContents = selectionFragment.contents()
      let selectionMarkups = selectionContents.find(`.${classes.markup}`);
      if (selectionMarkups.length > 0) {
        selectionMarkups.each(function() {
          messages.push({
            message: parseHTML($(this).contents()),
            html: $(this).html()
          });
        });
      } else {
        messages.push({
          message: parseHTML(selectionContents),
          html: $('<div>').append(selectionFragment[0]).html()
        });
      }
      
      console.log(selection)
      console.log(messages)
      
      messages = messages.map(m => {
        m.message = m.message.trim()
        return m
      }).filter(m => !!m.message)
      if (messages.length > 0) {
        this.selectedMessages = messages.map(m => m.message);
        this.selectedMessages.htmls = messages.map(m => m.html)
      }
    }
  }
  
  canEmbed() {
    const channel = ReactUtilities.getOwnerInstance($(".chat")[0]);
    return channel.state.channel.isPrivate() || channel.can(0x4000, {channelId: channel.state.channel.id});
  }
  
  canChat() {
    const channel = ReactUtilities.getOwnerInstance($(".chat")[0]);
    return channel.state.channel.isPrivate() || channel.can(0x800, {channelId: channel.state.channel.id});
  }
  
  log(message, method = 'log') {
    console[method](`[${this.getName()}]`, message);
  }
  
  inject(name, options) {
    let element = document.getElementById(options.id);
    if (element) element.parentElement.removeChild(element);
    element = document.createElement(name);
    for (let attr in options)
      element.setAttribute(attr, options[attr]);
    document.head.appendChild(element);
    return element;
  }
  
  remove(element) {
    let elem = document.getElementById(element);
    if (elem)
      elem.parentElement.removeChild(elem);
  }
  
  deleteEverything() {
    $(document).off("mouseover.citador");
    $('.messages .message-group').off('mouseover');
    $('.messages .message-group').off('mouseleave');
    this.remove("citador-css");
    this.switchObserver.disconnect();
    this.initialized = false;
    this.cancel();
  }
  
  get guilds () { 
    return ReactUtilities.getOwnerInstance($(".guilds-wrapper")[0]).state.guilds.map(o => o.guild);
  }
  
  get defaultSettings() {
    return {
      useFallbackCodeblock: 1,
      mentionUser: false,
      disabledServers: []
    };
  }
  
  getIconTemplate(guild) {
    let disabled = this.settings.disabledServers.includes(guild.id) ? ' disabled' : '';
    return guild.icon
      ? `<a class="avatar-small ${disabled}" style="background-image: url(https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp)"></a>`
      : `<a class="avatar-small ${disabled}">${guild.acronym}</a>`;
  }
  
  saveSettings() {
    PluginUtilities.saveSettings(this.getName(), this.settings);
  }

  loadSettings() {
    this.settings = PluginUtilities.loadSettings(this.getName(), this.defaultSettings);
  }
  
  resetSettings(panel) {
    this.settings = this.defaultSettings;
    this.saveSettings();
    panel.empty();
    this.generateSettings(panel);
  }
  
  generateSettings(panel) {
    const defaultForm = 
      `<div class="citador ui-form-item flexChild-1KGW5q">
        <h5 class="h5 h5-18_1nd"></h5>
        <div class="description"></div>
      </div>`;
    panel.append(
      $(defaultForm)
        .css('padding-top', '10px')
        .find('.h5')
        .toggleClass('title-3sZWYQ size12-3R0845 height16-2Lv3qA weightSemiBold-NJexzi defaultMarginh5-2mL-bP marginBottom8-AtZOdT')
        .html(this.local.settings.mentionUser.title)
        .parent()
        .find('.description')
        .html(this.local.settings.mentionUser.description)
        .toggleClass('description-3_Ncsb formText-3fs7AJ marginBottom8-AtZOdT modeDefault-3a2Ph1 primary-jw0I4K')
        .append(
          new PluginSettings.Checkbox(this.local.settings.mentionUser.title, this.local.settings.mentionUser.description, this.settings.mentionUser, value => {
            this.settings.mentionUser = value;
            this.saveSettings();
          }).getElement().find('.input-wrapper')
        )
        .parent(),
      $(defaultForm)
        .find('.h5')
        .toggleClass('title-3sZWYQ size12-3R0845 height16-2Lv3qA weightSemiBold-NJexzi defaultMarginh5-2mL-bP marginBottom8-AtZOdT')
        .html(this.local.settings.useFallbackCodeblock.title)
        .parent()
        .append(
          $('<div class="radioGroup-1GBvlr">')
          .append(
            this.local.settings.useFallbackCodeblock.choices.map((choice, i) =>
              this.Checkbox(choice, this.settings.useFallbackCodeblock, i)
            )
          )
        ),
      $(defaultForm)
        .css('padding-top', '10px')
        .find('.h5')
        .toggleClass('title-3sZWYQ size12-3R0845 height16-2Lv3qA weightSemiBold-NJexzi defaultMarginh5-2mL-bP marginBottom8-AtZOdT')
        .html(this.local.settings.disableServers.title)
        .parent()
        .find('.description')
        .html(this.local.settings.disableServers.description)
        .toggleClass('description-3_Ncsb formText-3fs7AJ marginBottom8-AtZOdT modeDefault-3a2Ph1 primary-jw0I4K')
        .parent()
        .append(
          $('<div class="citador-guilds">').append(
            this.guilds.map(guild => {
              if (this.forcedGuilds.includes(guild.id)) return;
              let guildEl = this.GuildElement(guild);
              return guildEl
                .click(() => {
                  if (this.settings.disabledServers.includes(guild.id)) {
                    this.settings.disabledServers.splice(this.settings.disabledServers.indexOf(guild.id), 1);
                    guildEl.find('.avatar-small')
                      .toggleClass('disabled');
                  } else {
                    this.settings.disabledServers.push(guild.id);
                    guildEl.find('.avatar-small')
                      .toggleClass('disabled');
                  }
                  this.saveSettings();
                });
            })
          )
        ),
      $(defaultForm)
        .css('padding-top', '10px')
        .append(
          $(`<button type="button">`)
            .toggleClass('button-38aScr lookFilled-1Gx00P colorRed-1TFJan sizeMedium-1AC_Sl grow-q77ONN')
            .css({
              'margin': '0 auto'
            })
            .html(this.local.settings.reset)
            .click(() => this.resetSettings(panel))
        )
    );
  }
  
  Checkbox(value, setting, type) {
    let checkbox = $(`<div class="item-26Dhrx marginBottom8-AtZOdT horizontal-2EEEnY flex-1O1GKY directionRow-3v3tfG cardPrimaryEditable-3KtE4g card-3Qj_Yx" style="padding: 10px;">
      <label class="checkboxWrapper-SkhIWG">
        <input type="checkbox" class="inputDefault-3JxKJ2 input-3ITkQf">
        <div class="checkbox-1ix_J3 flexCenter-3_1bcw flex-1O1GKY justifyCenter-3D2jYp alignCenter-1dQNNs box-mmYMsp">
          <svg name="Checkmark" width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" fill-rule="evenodd">
              <polyline stroke="transparent" stroke-width="2" points="3.5 9.5 7 13 15 5"></polyline>
            </g>
          </svg>
        </div>
      </label>
      <div class="info-3LOr12">
        <div class="title-3BE6m5">${value}</div>
      </div>
    </div>`);
    if (setting == type) {
      checkbox
        .css({
          'border-color': 'rgb(114, 137, 218)',
          'background-color': 'rgb(114, 137, 218)'
        })
        .find('.checkbox-1ix_J3')
        .toggleClass('checked-3_4uQ9')
        .css('border-color', 'rgb(114, 137, 218)');
      checkbox
        .find('polyline')
        .attr('stroke', '#7289da');
      checkbox
        .find('.title-3BE6m5')
        .toggleClass('titleChecked-2wg0pd')
        .css('color', 'rgb(255, 255, 255)');
      return checkbox;
    } else {
      return checkbox
        .on('click.citador', () => {
          if (type == 0 || type == 2)
            PluginUtilities.showConfirmationModal(this.local.warning.title, this.local.warning.description, {
              confirmText: this.local.warning.yes,
              cancelText: this.local.warning.no,
              onConfirm: () => {
                this.settings.useFallbackCodeblock = type;
                this.saveSettings();
                checkbox.parent().empty().append(
                  this.local.settings.useFallbackCodeblock.choices.map((choice, i) => 
                    this.Checkbox(choice, this.settings.useFallbackCodeblock, i)
                  )
                );
              },
              onCancel: () => {
                return;
              }
            });
          else {
            this.settings.useFallbackCodeblock = type;
      
            this.saveSettings();
            checkbox.parent().empty().append(
              this.local.settings.useFallbackCodeblock.choices.map((choice, i) => 
                this.Checkbox(choice, this.settings.useFallbackCodeblock, i)
              )
            );
          }
        });
    }
  }
  
  GuildElement(guild) {
    const guildEl = $(
    `<div class="guild">
       <div>
         <div class="guild-inner">
           ${this.getIconTemplate(guild)}
         </div>
       </div>
     </div>`);
    new PluginTooltip.Tooltip(guildEl.find('.avatar-small'), guild.name);
    return guildEl;
  }
}
