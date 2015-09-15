
$(function(){
  Gmacs.modes.search = new Search();
  console.log('search.js');
  var defaultMode = Gmacs.modes.default;
  defaultMode.keyEventMap['C-s'] = 'enterSearchMode';
  defaultMode.commands.enterSearchMode = function(opt){
    opt.buffer.search_forward = true;
    Gmacs.changeMode('search');
    Gmacs.buffers['mini-buffer'].$prompt.text('I-search:');
  };
  defaultMode.keyEventMap['C-r'] = 'enterSearchBackwardMode';
  defaultMode.commands.enterSearchBackwardMode = function(opt){
    opt.buffer.search_forward = false;
    Gmacs.changeMode('search');
    Gmacs.buffers['mini-buffer'].$prompt.text('I-search:');
  };

});


function Search(){
  this.init.apply(this, arguments);
}

Search.prototype.init = function(){
  this.keyEventMap = {};
  this.commands = {};
  prepareKeyEventMapForSearch(this, Gmacs.modes, this.commands, this.keyEventMap, '\n');
};

Gmacs.Buffer.prototype.searchCore = function(){
  var keyword = this.search_keyword;
  var len = keyword.length;
  var $e = this.$buffer;
  var $chars = $('span.char', $e);
  $('.found', $e).removeClass('found');
  var text = $chars.text();

  var offset = 0;
  var indices = this.search_indices = [];
  var count = this.count();
  var moved = false;
  while(true){
    var index = text.indexOf(keyword, offset);
    if(index < 0){
      break;
    }
    indices.push([index, index + len]);
    $($chars.slice(index, index + len)).addClass('found');
    offset = index + len;
  }
};

Gmacs.Buffer.prototype.search = function(){
  if(this.search_keyword == null) return;
  this.searchCore();
  search_and_go(this, 0, this.search_forward);
};
console.log("hoge");

function search_and_go(buffer, count_diff, next_or_prev){
  if(buffer.search_keyword == null || buffer.search_keyword == ''){
    
    
    buffer.search_keyword = buffer.pre_search_keyword;
    var mb = Gmacs.buffers['mini-buffer'];
    mb.$prompt.text('I-search: ');
    buffer.search_keyword.split('').forEach(function(c){mb.insertChar(c);});
    buffer.search();
    return;
  }


  var $e = buffer.$buffer;
  var $chars = $('span.char', $e);
  var indices = buffer.search_indices;
  var count = buffer.count() + count_diff;
  var moved = false;
  var i,l,b,e;
  $('.found', $e).removeClass('found');
  $('.look', $e).removeClass('look');
  if(next_or_prev){
    for(i = 0, l = indices.length;i<l ;i++){
      b = indices[i][0];
      e = indices[i][1];
      $($chars.slice(b, e)).addClass('found');
      if(!moved && b >= count){
        buffer.moveCursorAt(b);
        $($chars.slice(b, e)).addClass('look');
        moved = true;
      }
    }
  } else {
    for(l = indices.length-1;l>=0 ;l--){
      b = indices[l][0];
      e = indices[l][1];
      $($chars.slice(b, e)).addClass('found');
      if(!moved && b <= count){
        $($chars.slice(b, e)).addClass('look');
        buffer.moveCursorAt(b);
        moved = true;
      }
    }
  }
}

function prepareKeyEventMapForSearch(search, modes, commands, keyEventMap, lineDelimiter){
  var $prompt = Gmacs.buffers['mini-buffer'].$prompt;

  prepareBasicKeyInputHandler();

  keyEventMap['<default>'] = 'quit';
  commands.quit = function(opt){
    var buffer = opt.buffer;
    var $e = buffer.$e;
    $('.found', $e).removeClass('found');
    $('.look', $e).removeClass('look');
    buffer.search_indices = [];
    buffer.pre_search_keyword = buffer.search_keyword;
    buffer.search_keyword = '';
    $prompt.text('');
    Gmacs.popMode();
  };

  keyEventMap['C-s'] = 'next';
  commands.next = function(opt){
    search_and_go(opt.buffer, 1, true);
  };

  keyEventMap['C-r'] = 'prev';
  commands.prev = function(opt){
    search_and_go(opt.buffer, -1, false);
  };


  
  // prepareCursorOperationHandler();
  // prepareCombinationSequences();

  // function prepareUndoRedoOperations(){
  //   commands.undo = undo;
  //   commands.redo = redo;
  //   keyEventMap['C-/'] = keyEventMap['C--'] = 'undo';
  //   keyEventMap['C-.'] = keyEventMap['C-,'] = 'redo';
  // }

  // function prepareMarkOperations(){
  //   commands.markSet = markSet;
  //   commands.swapMarkAndCursor = swapMarkAndCursor;
  //   commands.moveToPreMark = moveToPreMark;
  //   commands.cutRegion = cutRegion;
  //   commands.copyRegion = copyRegion;
  //   commands.yankRegion = yankRegion;
  //   commands.yankPrevRegion = yankPrevRegion;
  //   keyEventMap['C-@'] = keyEventMap['C- '] = 'markSet';
  //   keyEventMap['C-xC-x'] = 'swapMarkAndCursor';
  //   keyEventMap['C-uC- '] = keyEventMap['C-uC-@'] = 'moveToPreMark';
  //   keyEventMap['C-w'] = 'cutRegion';
  //   keyEventMap['A-w'] = keyEventMap['M-w'] = 'copyRegion';
  //   keyEventMap['C-y'] = 'yankRegion';
  //   keyEventMap['A-y'] = keyEventMap['M-y'] = 'yankPrevRegion';
  // }


  function prepareBasicKeyInputHandler(){
    for(var code=32;code <= 126; code++){
      var char = String.fromCharCode(code);
      // console.log(char);
      var handler = generateKeyInputHandler(char);
      var commandName = 'insertChar(' + char + ')';
      commands[commandName] = handler;
      keyEventMap[char] = commandName;
      keyEventMap['S-' + char] = commandName;
    }
    // var insertLineDelimiter = generateKeyInputHandler(lineDelimiter || '\n');
    keyEventMap['C-m'] = keyEventMap['Enter'] = 'inputKeyword';
    commands.inputKeyword = function(opt){
      var buffer =opt.buffer;
      Gmacs.prompt([{name:'Search', default: buffer.search_keyword}],
                   {
                     success: function(args){
                       var mb = Gmacs.buffers['mini-buffer'];
                       var $prompt = mb.$prompt;
                       $prompt.text('I-search:');
                       var keyword = args.Search;
                       keyword.split('').forEach(function(c){mb.insertChar(c);});
                       buffer.search_keyword = keyword;
                       buffer.search();
                     },
                     fail: function(args){
                     }
                   });
    };
    keyEventMap['C-h'] = keyEventMap['Backspace'] = 'backspace';
    commands.backspace = function(opt){
      var buffer = opt.buffer;
      var keyword = buffer.search_keyword;
      if(keyword == null || keyword == ''){
        return;
      }
      var mb = Gmacs.buffers['mini-buffer'];
      var $prompt = mb.$prompt;
      keyword = keyword.substr(0, keyword.length-1);
      buffer.search_keyword = keyword;
      mb.clear();
      $prompt.text('I-search: ');
      keyword.split('').forEach(function(c){mb.insertChar(c);});
      if(keyword.length > 0){
        buffer.search();
      }

    };
    //commands.deleteChar = deleteChar;
    //keyEventMap['C-d'] = keyEventMap['Del'] = 'deleteChar';
  }

  // function prepareCombinationSequences(){
  //   setKeepSequenceHandler('C-u');
  //   setKeepSequenceHandler('C-x');
  //   setKeepSequenceHandler('C-c');
  //   commands.reset = reset;
  //   keyEventMap['C-xk'] = 'reset';
  // }

  // function setKeepSequenceHandler(sequence){
  //   var commandName =  'keepSequence(' + sequence + ')';
  //   keyEventMap[sequence] = commandName;
  //   commands[commandName] = function(opt){
  //     if(Gmacs.past_input != null){
  //       Gmacs.past_input += sequence;
  //     } else {
  //       Gmacs.past_input = sequence;
  //     }
  //     mb.insertText(Gmacs.past_input);
  //     // console.log(Gmacs.past_input);
  //     return {keepPastInput : true};
  //   };
  // }

  function generateKeyInputHandler(char){
    return function(opt){
      if(char == lineDelimiter){
        // TODO: change to mini-buffer mode
        return;
      }
      var buffer = opt.buffer;
      var keyword = buffer.search_keyword || '';
      keyword += char;
      buffer.search_keyword = keyword;
      $prompt.text('I-search: ' + keyword);
      buffer.search();

    };
  }

  function reset(opt){
    var buffer = opt.buffer;
    buffer.reset();
  }

  function markSet(opt){
    var buffer = opt.buffer;
    buffer.markSet();
  }

  function swapMarkAndCursor(opt){
    var buffer = opt.buffer;
    buffer.swapMarkAndCursor();
  }

  function cutRegion(opt){
        var buffer = opt.buffer;
    buffer.cutRegion();
  }

  function copyRegion(opt){
        var buffer = opt.buffer;
    buffer.copyRegion();
  }

  function yankRegion(opt){
    var buffer = opt.buffer;
    buffer.yankRegion();
  }

  function yankPrevRegion(opt){
    var buffer = opt.buffer;
    buffer.yankPrevRegion();
  };

  function moveToPreMark(opt){
    var buffer = opt.buffer;
    buffer.moveToPreMark();
  }

  function backspace(opt){
    var buffer = opt.buffer;
    buffer.backspace();
  }

  function deleteChar(opt){
    var buffer = opt.buffer;
    buffer.delete();
  }

      function undo(opt){
        var buffer = opt.buffer;
        buffer.undo();
      }

  function redo(opt){
    var buffer = opt.buffer;
    buffer.redo();
  }

  function prepareCursorOperationHandler(){
    keyEventMap['C-b'] = keyEventMap['Left'] = 'moveBack';
    commands.moveBack = function(opt){
      var buffer = opt.buffer;
      buffer.moveCursorHorizontally(-1);
        };
    keyEventMap['C-f'] = keyEventMap['Right'] = 'moveForward';
    commands.moveForward = function(opt){
      var buffer = opt.buffer;
      buffer.moveCursorHorizontally(+1);
    };
    keyEventMap['C-p'] = keyEventMap['Up'] = 'movePreviousLine';
    commands.movePreviousLine = function(opt){
      var buffer = opt.buffer;
      buffer.moveCursorVertically(-1);
    };
    keyEventMap['C-n'] = keyEventMap['Down'] = 'moveNextLine';
    commands.moveNextLine = function(opt){
      var buffer = opt.buffer;
      buffer.moveCursorVertically(+1);
    };
    keyEventMap['C-a'] = keyEventMap['Home'] = 'moveBOL';
    commands.moveBOL = function(opt){
      var buffer = opt.buffer;
      buffer.moveCursorToBOL();
    };
    keyEventMap['C-e'] = keyEventMap['End'] = 'moveEOL';
    commands.moveEOL = function(opt){
      var buffer = opt.buffer;
      buffer.moveCursorToEOL();
    };
  }
}
