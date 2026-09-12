import {
  DevAssets,
  DevBotCtrl,
  GameCtrl,
  LocalDb,
  RateBot,
  botEquals,
  deadStrip,
  domIdToUid,
  env,
  handOfCards,
  makeEnv,
  maxChars,
  playersWithResults,
  rangeTicks,
  rateBotMatchup,
  removeObjectProperty,
  renderGameView,
  renderRemoveButton,
  resultsString,
  setObjectProperty,
  showSetupDialog,
  uidToDomId
} from "./lib.FAOLKJV6.js";
import {
  Bot,
  addPoint,
  asData,
  filterBys,
  filterFacetKeys,
  filterFacets,
  makeZerofish
} from "./lib.22P5PUXN.js";
import {
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement
} from "./lib.Q3AEFXB3.js";
import "./lib.EX2PZIT5.js";
import {
  wireCropDialog
} from "./lib.C76YZW6V.js";
import {
  statusOf
} from "./lib.67VUYMDO.js";
import "./lib.GD6YSPBF.js";
import {
  alert as alert2,
  confirm,
  domDialog,
  icon
} from "./lib.MYPIOGN5.js";
import "./lib.LRP46MC3.js";
import {
  clamp,
  deepFreeze,
  definedMap,
  shuffle
} from "./lib.HMFK7OOB.js";
import "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import {
  fen_exports
} from "./lib.X7H2PLEK.js";
import {
  opposite
} from "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import {
  Janitor,
  makeLog
} from "./lib.PNHYIP7B.js";
import {
  bind,
  dataIcon,
  hl,
  onInsert
} from "./lib.S3TIZ2HQ.js";
import {
  attributesModule,
  classModule,
  init
} from "./lib.LWF5S4ZV.js";
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import {
  licon
} from "./lib.5I4BSVKX.js";
import "./lib.TT4QSUKQ.js";
import {
  objectStorage,
  storedBooleanProp,
  storedIntProp
} from "./lib.NFSQQWN5.js";
import {
  defined,
  escapeHtml,
  frag,
  memoize,
  myUserId
} from "./lib.GMEH5BEF.js";
import {
  __commonJS,
  __toESM
} from "./lib.KO2KTNGK.js";

// ../../../../../node_modules/.pnpm/fast-diff@1.3.0/node_modules/fast-diff/diff.js
var require_diff = __commonJS({
  "../../../../../node_modules/.pnpm/fast-diff@1.3.0/node_modules/fast-diff/diff.js"(exports, module) {
    var DIFF_DELETE = -1;
    var DIFF_INSERT = 1;
    var DIFF_EQUAL = 0;
    function diff_main(text1, text2, cursor_pos, cleanup, _fix_unicode) {
      if (text1 === text2) {
        if (text1) {
          return [[DIFF_EQUAL, text1]];
        }
        return [];
      }
      if (cursor_pos != null) {
        var editdiff = find_cursor_edit_diff(text1, text2, cursor_pos);
        if (editdiff) {
          return editdiff;
        }
      }
      var commonlength = diff_commonPrefix(text1, text2);
      var commonprefix = text1.substring(0, commonlength);
      text1 = text1.substring(commonlength);
      text2 = text2.substring(commonlength);
      commonlength = diff_commonSuffix(text1, text2);
      var commonsuffix = text1.substring(text1.length - commonlength);
      text1 = text1.substring(0, text1.length - commonlength);
      text2 = text2.substring(0, text2.length - commonlength);
      var diffs = diff_compute_(text1, text2);
      if (commonprefix) {
        diffs.unshift([DIFF_EQUAL, commonprefix]);
      }
      if (commonsuffix) {
        diffs.push([DIFF_EQUAL, commonsuffix]);
      }
      diff_cleanupMerge(diffs, _fix_unicode);
      if (cleanup) {
        diff_cleanupSemantic(diffs);
      }
      return diffs;
    }
    function diff_compute_(text1, text2) {
      var diffs;
      if (!text1) {
        return [[DIFF_INSERT, text2]];
      }
      if (!text2) {
        return [[DIFF_DELETE, text1]];
      }
      var longtext = text1.length > text2.length ? text1 : text2;
      var shorttext = text1.length > text2.length ? text2 : text1;
      var i = longtext.indexOf(shorttext);
      if (i !== -1) {
        diffs = [
          [DIFF_INSERT, longtext.substring(0, i)],
          [DIFF_EQUAL, shorttext],
          [DIFF_INSERT, longtext.substring(i + shorttext.length)]
        ];
        if (text1.length > text2.length) {
          diffs[0][0] = diffs[2][0] = DIFF_DELETE;
        }
        return diffs;
      }
      if (shorttext.length === 1) {
        return [
          [DIFF_DELETE, text1],
          [DIFF_INSERT, text2]
        ];
      }
      var hm = diff_halfMatch_(text1, text2);
      if (hm) {
        var text1_a = hm[0];
        var text1_b = hm[1];
        var text2_a = hm[2];
        var text2_b = hm[3];
        var mid_common = hm[4];
        var diffs_a = diff_main(text1_a, text2_a);
        var diffs_b = diff_main(text1_b, text2_b);
        return diffs_a.concat([[DIFF_EQUAL, mid_common]], diffs_b);
      }
      return diff_bisect_(text1, text2);
    }
    function diff_bisect_(text1, text2) {
      var text1_length = text1.length;
      var text2_length = text2.length;
      var max_d = Math.ceil((text1_length + text2_length) / 2);
      var v_offset = max_d;
      var v_length = 2 * max_d;
      var v1 = new Array(v_length);
      var v2 = new Array(v_length);
      for (var x = 0; x < v_length; x++) {
        v1[x] = -1;
        v2[x] = -1;
      }
      v1[v_offset + 1] = 0;
      v2[v_offset + 1] = 0;
      var delta = text1_length - text2_length;
      var front = delta % 2 !== 0;
      var k1start = 0;
      var k1end = 0;
      var k2start = 0;
      var k2end = 0;
      for (var d = 0; d < max_d; d++) {
        for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
          var k1_offset = v_offset + k1;
          var x1;
          if (k1 === -d || k1 !== d && v1[k1_offset - 1] < v1[k1_offset + 1]) {
            x1 = v1[k1_offset + 1];
          } else {
            x1 = v1[k1_offset - 1] + 1;
          }
          var y1 = x1 - k1;
          while (x1 < text1_length && y1 < text2_length && text1.charAt(x1) === text2.charAt(y1)) {
            x1++;
            y1++;
          }
          v1[k1_offset] = x1;
          if (x1 > text1_length) {
            k1end += 2;
          } else if (y1 > text2_length) {
            k1start += 2;
          } else if (front) {
            var k2_offset = v_offset + delta - k1;
            if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] !== -1) {
              var x2 = text1_length - v2[k2_offset];
              if (x1 >= x2) {
                return diff_bisectSplit_(text1, text2, x1, y1);
              }
            }
          }
        }
        for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
          var k2_offset = v_offset + k2;
          var x2;
          if (k2 === -d || k2 !== d && v2[k2_offset - 1] < v2[k2_offset + 1]) {
            x2 = v2[k2_offset + 1];
          } else {
            x2 = v2[k2_offset - 1] + 1;
          }
          var y2 = x2 - k2;
          while (x2 < text1_length && y2 < text2_length && text1.charAt(text1_length - x2 - 1) === text2.charAt(text2_length - y2 - 1)) {
            x2++;
            y2++;
          }
          v2[k2_offset] = x2;
          if (x2 > text1_length) {
            k2end += 2;
          } else if (y2 > text2_length) {
            k2start += 2;
          } else if (!front) {
            var k1_offset = v_offset + delta - k2;
            if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] !== -1) {
              var x1 = v1[k1_offset];
              var y1 = v_offset + x1 - k1_offset;
              x2 = text1_length - x2;
              if (x1 >= x2) {
                return diff_bisectSplit_(text1, text2, x1, y1);
              }
            }
          }
        }
      }
      return [
        [DIFF_DELETE, text1],
        [DIFF_INSERT, text2]
      ];
    }
    function diff_bisectSplit_(text1, text2, x, y) {
      var text1a = text1.substring(0, x);
      var text2a = text2.substring(0, y);
      var text1b = text1.substring(x);
      var text2b = text2.substring(y);
      var diffs = diff_main(text1a, text2a);
      var diffsb = diff_main(text1b, text2b);
      return diffs.concat(diffsb);
    }
    function diff_commonPrefix(text1, text2) {
      if (!text1 || !text2 || text1.charAt(0) !== text2.charAt(0)) {
        return 0;
      }
      var pointermin = 0;
      var pointermax = Math.min(text1.length, text2.length);
      var pointermid = pointermax;
      var pointerstart = 0;
      while (pointermin < pointermid) {
        if (text1.substring(pointerstart, pointermid) == text2.substring(pointerstart, pointermid)) {
          pointermin = pointermid;
          pointerstart = pointermin;
        } else {
          pointermax = pointermid;
        }
        pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
      }
      if (is_surrogate_pair_start(text1.charCodeAt(pointermid - 1))) {
        pointermid--;
      }
      return pointermid;
    }
    function diff_commonOverlap_(text1, text2) {
      var text1_length = text1.length;
      var text2_length = text2.length;
      if (text1_length == 0 || text2_length == 0) {
        return 0;
      }
      if (text1_length > text2_length) {
        text1 = text1.substring(text1_length - text2_length);
      } else if (text1_length < text2_length) {
        text2 = text2.substring(0, text1_length);
      }
      var text_length = Math.min(text1_length, text2_length);
      if (text1 == text2) {
        return text_length;
      }
      var best = 0;
      var length = 1;
      while (true) {
        var pattern = text1.substring(text_length - length);
        var found = text2.indexOf(pattern);
        if (found == -1) {
          return best;
        }
        length += found;
        if (found == 0 || text1.substring(text_length - length) == text2.substring(0, length)) {
          best = length;
          length++;
        }
      }
    }
    function diff_commonSuffix(text1, text2) {
      if (!text1 || !text2 || text1.slice(-1) !== text2.slice(-1)) {
        return 0;
      }
      var pointermin = 0;
      var pointermax = Math.min(text1.length, text2.length);
      var pointermid = pointermax;
      var pointerend = 0;
      while (pointermin < pointermid) {
        if (text1.substring(text1.length - pointermid, text1.length - pointerend) == text2.substring(text2.length - pointermid, text2.length - pointerend)) {
          pointermin = pointermid;
          pointerend = pointermin;
        } else {
          pointermax = pointermid;
        }
        pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
      }
      if (is_surrogate_pair_end(text1.charCodeAt(text1.length - pointermid))) {
        pointermid--;
      }
      return pointermid;
    }
    function diff_halfMatch_(text1, text2) {
      var longtext = text1.length > text2.length ? text1 : text2;
      var shorttext = text1.length > text2.length ? text2 : text1;
      if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
        return null;
      }
      function diff_halfMatchI_(longtext2, shorttext2, i) {
        var seed = longtext2.substring(i, i + Math.floor(longtext2.length / 4));
        var j = -1;
        var best_common = "";
        var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
        while ((j = shorttext2.indexOf(seed, j + 1)) !== -1) {
          var prefixLength = diff_commonPrefix(
            longtext2.substring(i),
            shorttext2.substring(j)
          );
          var suffixLength = diff_commonSuffix(
            longtext2.substring(0, i),
            shorttext2.substring(0, j)
          );
          if (best_common.length < suffixLength + prefixLength) {
            best_common = shorttext2.substring(j - suffixLength, j) + shorttext2.substring(j, j + prefixLength);
            best_longtext_a = longtext2.substring(0, i - suffixLength);
            best_longtext_b = longtext2.substring(i + prefixLength);
            best_shorttext_a = shorttext2.substring(0, j - suffixLength);
            best_shorttext_b = shorttext2.substring(j + prefixLength);
          }
        }
        if (best_common.length * 2 >= longtext2.length) {
          return [
            best_longtext_a,
            best_longtext_b,
            best_shorttext_a,
            best_shorttext_b,
            best_common
          ];
        } else {
          return null;
        }
      }
      var hm1 = diff_halfMatchI_(
        longtext,
        shorttext,
        Math.ceil(longtext.length / 4)
      );
      var hm2 = diff_halfMatchI_(
        longtext,
        shorttext,
        Math.ceil(longtext.length / 2)
      );
      var hm;
      if (!hm1 && !hm2) {
        return null;
      } else if (!hm2) {
        hm = hm1;
      } else if (!hm1) {
        hm = hm2;
      } else {
        hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
      }
      var text1_a, text1_b, text2_a, text2_b;
      if (text1.length > text2.length) {
        text1_a = hm[0];
        text1_b = hm[1];
        text2_a = hm[2];
        text2_b = hm[3];
      } else {
        text2_a = hm[0];
        text2_b = hm[1];
        text1_a = hm[2];
        text1_b = hm[3];
      }
      var mid_common = hm[4];
      return [text1_a, text1_b, text2_a, text2_b, mid_common];
    }
    function diff_cleanupSemantic(diffs) {
      var changes = false;
      var equalities = [];
      var equalitiesLength = 0;
      var lastequality = null;
      var pointer = 0;
      var length_insertions1 = 0;
      var length_deletions1 = 0;
      var length_insertions2 = 0;
      var length_deletions2 = 0;
      while (pointer < diffs.length) {
        if (diffs[pointer][0] == DIFF_EQUAL) {
          equalities[equalitiesLength++] = pointer;
          length_insertions1 = length_insertions2;
          length_deletions1 = length_deletions2;
          length_insertions2 = 0;
          length_deletions2 = 0;
          lastequality = diffs[pointer][1];
        } else {
          if (diffs[pointer][0] == DIFF_INSERT) {
            length_insertions2 += diffs[pointer][1].length;
          } else {
            length_deletions2 += diffs[pointer][1].length;
          }
          if (lastequality && lastequality.length <= Math.max(length_insertions1, length_deletions1) && lastequality.length <= Math.max(length_insertions2, length_deletions2)) {
            diffs.splice(equalities[equalitiesLength - 1], 0, [
              DIFF_DELETE,
              lastequality
            ]);
            diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
            equalitiesLength--;
            equalitiesLength--;
            pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
            length_insertions1 = 0;
            length_deletions1 = 0;
            length_insertions2 = 0;
            length_deletions2 = 0;
            lastequality = null;
            changes = true;
          }
        }
        pointer++;
      }
      if (changes) {
        diff_cleanupMerge(diffs);
      }
      diff_cleanupSemanticLossless(diffs);
      pointer = 1;
      while (pointer < diffs.length) {
        if (diffs[pointer - 1][0] == DIFF_DELETE && diffs[pointer][0] == DIFF_INSERT) {
          var deletion = diffs[pointer - 1][1];
          var insertion = diffs[pointer][1];
          var overlap_length1 = diff_commonOverlap_(deletion, insertion);
          var overlap_length2 = diff_commonOverlap_(insertion, deletion);
          if (overlap_length1 >= overlap_length2) {
            if (overlap_length1 >= deletion.length / 2 || overlap_length1 >= insertion.length / 2) {
              diffs.splice(pointer, 0, [
                DIFF_EQUAL,
                insertion.substring(0, overlap_length1)
              ]);
              diffs[pointer - 1][1] = deletion.substring(
                0,
                deletion.length - overlap_length1
              );
              diffs[pointer + 1][1] = insertion.substring(overlap_length1);
              pointer++;
            }
          } else {
            if (overlap_length2 >= deletion.length / 2 || overlap_length2 >= insertion.length / 2) {
              diffs.splice(pointer, 0, [
                DIFF_EQUAL,
                deletion.substring(0, overlap_length2)
              ]);
              diffs[pointer - 1][0] = DIFF_INSERT;
              diffs[pointer - 1][1] = insertion.substring(
                0,
                insertion.length - overlap_length2
              );
              diffs[pointer + 1][0] = DIFF_DELETE;
              diffs[pointer + 1][1] = deletion.substring(overlap_length2);
              pointer++;
            }
          }
          pointer++;
        }
        pointer++;
      }
    }
    var nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/;
    var whitespaceRegex_ = /\s/;
    var linebreakRegex_ = /[\r\n]/;
    var blanklineEndRegex_ = /\n\r?\n$/;
    var blanklineStartRegex_ = /^\r?\n\r?\n/;
    function diff_cleanupSemanticLossless(diffs) {
      function diff_cleanupSemanticScore_(one, two) {
        if (!one || !two) {
          return 6;
        }
        var char1 = one.charAt(one.length - 1);
        var char2 = two.charAt(0);
        var nonAlphaNumeric1 = char1.match(nonAlphaNumericRegex_);
        var nonAlphaNumeric2 = char2.match(nonAlphaNumericRegex_);
        var whitespace1 = nonAlphaNumeric1 && char1.match(whitespaceRegex_);
        var whitespace2 = nonAlphaNumeric2 && char2.match(whitespaceRegex_);
        var lineBreak1 = whitespace1 && char1.match(linebreakRegex_);
        var lineBreak2 = whitespace2 && char2.match(linebreakRegex_);
        var blankLine1 = lineBreak1 && one.match(blanklineEndRegex_);
        var blankLine2 = lineBreak2 && two.match(blanklineStartRegex_);
        if (blankLine1 || blankLine2) {
          return 5;
        } else if (lineBreak1 || lineBreak2) {
          return 4;
        } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
          return 3;
        } else if (whitespace1 || whitespace2) {
          return 2;
        } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
          return 1;
        }
        return 0;
      }
      var pointer = 1;
      while (pointer < diffs.length - 1) {
        if (diffs[pointer - 1][0] == DIFF_EQUAL && diffs[pointer + 1][0] == DIFF_EQUAL) {
          var equality1 = diffs[pointer - 1][1];
          var edit = diffs[pointer][1];
          var equality2 = diffs[pointer + 1][1];
          var commonOffset = diff_commonSuffix(equality1, edit);
          if (commonOffset) {
            var commonString = edit.substring(edit.length - commonOffset);
            equality1 = equality1.substring(0, equality1.length - commonOffset);
            edit = commonString + edit.substring(0, edit.length - commonOffset);
            equality2 = commonString + equality2;
          }
          var bestEquality1 = equality1;
          var bestEdit = edit;
          var bestEquality2 = equality2;
          var bestScore = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
          while (edit.charAt(0) === equality2.charAt(0)) {
            equality1 += edit.charAt(0);
            edit = edit.substring(1) + equality2.charAt(0);
            equality2 = equality2.substring(1);
            var score = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
            if (score >= bestScore) {
              bestScore = score;
              bestEquality1 = equality1;
              bestEdit = edit;
              bestEquality2 = equality2;
            }
          }
          if (diffs[pointer - 1][1] != bestEquality1) {
            if (bestEquality1) {
              diffs[pointer - 1][1] = bestEquality1;
            } else {
              diffs.splice(pointer - 1, 1);
              pointer--;
            }
            diffs[pointer][1] = bestEdit;
            if (bestEquality2) {
              diffs[pointer + 1][1] = bestEquality2;
            } else {
              diffs.splice(pointer + 1, 1);
              pointer--;
            }
          }
        }
        pointer++;
      }
    }
    function diff_cleanupMerge(diffs, fix_unicode) {
      diffs.push([DIFF_EQUAL, ""]);
      var pointer = 0;
      var count_delete = 0;
      var count_insert = 0;
      var text_delete = "";
      var text_insert = "";
      var commonlength;
      while (pointer < diffs.length) {
        if (pointer < diffs.length - 1 && !diffs[pointer][1]) {
          diffs.splice(pointer, 1);
          continue;
        }
        switch (diffs[pointer][0]) {
          case DIFF_INSERT:
            count_insert++;
            text_insert += diffs[pointer][1];
            pointer++;
            break;
          case DIFF_DELETE:
            count_delete++;
            text_delete += diffs[pointer][1];
            pointer++;
            break;
          case DIFF_EQUAL:
            var previous_equality = pointer - count_insert - count_delete - 1;
            if (fix_unicode) {
              if (previous_equality >= 0 && ends_with_pair_start(diffs[previous_equality][1])) {
                var stray = diffs[previous_equality][1].slice(-1);
                diffs[previous_equality][1] = diffs[previous_equality][1].slice(
                  0,
                  -1
                );
                text_delete = stray + text_delete;
                text_insert = stray + text_insert;
                if (!diffs[previous_equality][1]) {
                  diffs.splice(previous_equality, 1);
                  pointer--;
                  var k = previous_equality - 1;
                  if (diffs[k] && diffs[k][0] === DIFF_INSERT) {
                    count_insert++;
                    text_insert = diffs[k][1] + text_insert;
                    k--;
                  }
                  if (diffs[k] && diffs[k][0] === DIFF_DELETE) {
                    count_delete++;
                    text_delete = diffs[k][1] + text_delete;
                    k--;
                  }
                  previous_equality = k;
                }
              }
              if (starts_with_pair_end(diffs[pointer][1])) {
                var stray = diffs[pointer][1].charAt(0);
                diffs[pointer][1] = diffs[pointer][1].slice(1);
                text_delete += stray;
                text_insert += stray;
              }
            }
            if (pointer < diffs.length - 1 && !diffs[pointer][1]) {
              diffs.splice(pointer, 1);
              break;
            }
            if (text_delete.length > 0 || text_insert.length > 0) {
              if (text_delete.length > 0 && text_insert.length > 0) {
                commonlength = diff_commonPrefix(text_insert, text_delete);
                if (commonlength !== 0) {
                  if (previous_equality >= 0) {
                    diffs[previous_equality][1] += text_insert.substring(
                      0,
                      commonlength
                    );
                  } else {
                    diffs.splice(0, 0, [
                      DIFF_EQUAL,
                      text_insert.substring(0, commonlength)
                    ]);
                    pointer++;
                  }
                  text_insert = text_insert.substring(commonlength);
                  text_delete = text_delete.substring(commonlength);
                }
                commonlength = diff_commonSuffix(text_insert, text_delete);
                if (commonlength !== 0) {
                  diffs[pointer][1] = text_insert.substring(text_insert.length - commonlength) + diffs[pointer][1];
                  text_insert = text_insert.substring(
                    0,
                    text_insert.length - commonlength
                  );
                  text_delete = text_delete.substring(
                    0,
                    text_delete.length - commonlength
                  );
                }
              }
              var n = count_insert + count_delete;
              if (text_delete.length === 0 && text_insert.length === 0) {
                diffs.splice(pointer - n, n);
                pointer = pointer - n;
              } else if (text_delete.length === 0) {
                diffs.splice(pointer - n, n, [DIFF_INSERT, text_insert]);
                pointer = pointer - n + 1;
              } else if (text_insert.length === 0) {
                diffs.splice(pointer - n, n, [DIFF_DELETE, text_delete]);
                pointer = pointer - n + 1;
              } else {
                diffs.splice(
                  pointer - n,
                  n,
                  [DIFF_DELETE, text_delete],
                  [DIFF_INSERT, text_insert]
                );
                pointer = pointer - n + 2;
              }
            }
            if (pointer !== 0 && diffs[pointer - 1][0] === DIFF_EQUAL) {
              diffs[pointer - 1][1] += diffs[pointer][1];
              diffs.splice(pointer, 1);
            } else {
              pointer++;
            }
            count_insert = 0;
            count_delete = 0;
            text_delete = "";
            text_insert = "";
            break;
        }
      }
      if (diffs[diffs.length - 1][1] === "") {
        diffs.pop();
      }
      var changes = false;
      pointer = 1;
      while (pointer < diffs.length - 1) {
        if (diffs[pointer - 1][0] === DIFF_EQUAL && diffs[pointer + 1][0] === DIFF_EQUAL) {
          if (diffs[pointer][1].substring(
            diffs[pointer][1].length - diffs[pointer - 1][1].length
          ) === diffs[pointer - 1][1]) {
            diffs[pointer][1] = diffs[pointer - 1][1] + diffs[pointer][1].substring(
              0,
              diffs[pointer][1].length - diffs[pointer - 1][1].length
            );
            diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
            diffs.splice(pointer - 1, 1);
            changes = true;
          } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) == diffs[pointer + 1][1]) {
            diffs[pointer - 1][1] += diffs[pointer + 1][1];
            diffs[pointer][1] = diffs[pointer][1].substring(diffs[pointer + 1][1].length) + diffs[pointer + 1][1];
            diffs.splice(pointer + 1, 1);
            changes = true;
          }
        }
        pointer++;
      }
      if (changes) {
        diff_cleanupMerge(diffs, fix_unicode);
      }
    }
    function is_surrogate_pair_start(charCode) {
      return charCode >= 55296 && charCode <= 56319;
    }
    function is_surrogate_pair_end(charCode) {
      return charCode >= 56320 && charCode <= 57343;
    }
    function starts_with_pair_end(str) {
      return is_surrogate_pair_end(str.charCodeAt(0));
    }
    function ends_with_pair_start(str) {
      return is_surrogate_pair_start(str.charCodeAt(str.length - 1));
    }
    function remove_empty_tuples(tuples) {
      var ret = [];
      for (var i = 0; i < tuples.length; i++) {
        if (tuples[i][1].length > 0) {
          ret.push(tuples[i]);
        }
      }
      return ret;
    }
    function make_edit_splice(before, oldMiddle, newMiddle, after) {
      if (ends_with_pair_start(before) || starts_with_pair_end(after)) {
        return null;
      }
      return remove_empty_tuples([
        [DIFF_EQUAL, before],
        [DIFF_DELETE, oldMiddle],
        [DIFF_INSERT, newMiddle],
        [DIFF_EQUAL, after]
      ]);
    }
    function find_cursor_edit_diff(oldText, newText, cursor_pos) {
      var oldRange = typeof cursor_pos === "number" ? { index: cursor_pos, length: 0 } : cursor_pos.oldRange;
      var newRange = typeof cursor_pos === "number" ? null : cursor_pos.newRange;
      var oldLength = oldText.length;
      var newLength = newText.length;
      if (oldRange.length === 0 && (newRange === null || newRange.length === 0)) {
        var oldCursor = oldRange.index;
        var oldBefore = oldText.slice(0, oldCursor);
        var oldAfter = oldText.slice(oldCursor);
        var maybeNewCursor = newRange ? newRange.index : null;
        editBefore: {
          var newCursor = oldCursor + newLength - oldLength;
          if (maybeNewCursor !== null && maybeNewCursor !== newCursor) {
            break editBefore;
          }
          if (newCursor < 0 || newCursor > newLength) {
            break editBefore;
          }
          var newBefore = newText.slice(0, newCursor);
          var newAfter = newText.slice(newCursor);
          if (newAfter !== oldAfter) {
            break editBefore;
          }
          var prefixLength = Math.min(oldCursor, newCursor);
          var oldPrefix = oldBefore.slice(0, prefixLength);
          var newPrefix = newBefore.slice(0, prefixLength);
          if (oldPrefix !== newPrefix) {
            break editBefore;
          }
          var oldMiddle = oldBefore.slice(prefixLength);
          var newMiddle = newBefore.slice(prefixLength);
          return make_edit_splice(oldPrefix, oldMiddle, newMiddle, oldAfter);
        }
        editAfter: {
          if (maybeNewCursor !== null && maybeNewCursor !== oldCursor) {
            break editAfter;
          }
          var cursor = oldCursor;
          var newBefore = newText.slice(0, cursor);
          var newAfter = newText.slice(cursor);
          if (newBefore !== oldBefore) {
            break editAfter;
          }
          var suffixLength = Math.min(oldLength - cursor, newLength - cursor);
          var oldSuffix = oldAfter.slice(oldAfter.length - suffixLength);
          var newSuffix = newAfter.slice(newAfter.length - suffixLength);
          if (oldSuffix !== newSuffix) {
            break editAfter;
          }
          var oldMiddle = oldAfter.slice(0, oldAfter.length - suffixLength);
          var newMiddle = newAfter.slice(0, newAfter.length - suffixLength);
          return make_edit_splice(oldBefore, oldMiddle, newMiddle, oldSuffix);
        }
      }
      if (oldRange.length > 0 && newRange && newRange.length === 0) {
        replaceRange: {
          var oldPrefix = oldText.slice(0, oldRange.index);
          var oldSuffix = oldText.slice(oldRange.index + oldRange.length);
          var prefixLength = oldPrefix.length;
          var suffixLength = oldSuffix.length;
          if (newLength < prefixLength + suffixLength) {
            break replaceRange;
          }
          var newPrefix = newText.slice(0, prefixLength);
          var newSuffix = newText.slice(newLength - suffixLength);
          if (oldPrefix !== newPrefix || oldSuffix !== newSuffix) {
            break replaceRange;
          }
          var oldMiddle = oldText.slice(prefixLength, oldLength - suffixLength);
          var newMiddle = newText.slice(prefixLength, newLength - suffixLength);
          return make_edit_splice(oldPrefix, oldMiddle, newMiddle, oldSuffix);
        }
      }
      return null;
    }
    function diff2(text1, text2, cursor_pos, cleanup) {
      return diff_main(text1, text2, cursor_pos, cleanup, true);
    }
    diff2.INSERT = DIFF_INSERT;
    diff2.DELETE = DIFF_DELETE;
    diff2.EQUAL = DIFF_EQUAL;
    module.exports = diff2;
  }
});

// ../botDev/src/devCtrl.ts
var DevCtrl = class {
  constructor() {
    this.hurryProp = storedBooleanProp("botdev.hurry", false);
    this.trace = [];
    this.ratings = {};
  }
  async init() {
    this.resetScript();
    [this.traceDb] = [makeLog({ store: "botmove" }, 1), this.getStoredRatings()];
    pubsub.on("theme", env.redraw);
  }
  get hurry() {
    return this.hurryProp() || this.gameInProgress && env.bot.playing.some((x) => "level" in x);
  }
  run(test, iterations = 1) {
    if (test) {
      this.resetScript(test);
      this.script.games.push(...this.matchups(test, iterations));
    }
    const game = this.script.games.shift();
    if (!game) return false;
    env.game.load({ ...game, setupFen: env.game.live.setupFen });
    env.redraw();
    env.game.start();
    return true;
  }
  resetScript(test) {
    var _a;
    (_a = this.log) != null ? _a : this.log = [];
    this.trace = [];
    const players = [env.game.white, env.game.black].filter((x) => defined(x));
    this.script = {
      type: "matchup",
      players,
      games: [],
      ...test
    };
  }
  onReset() {
  }
  beforeMove(uci) {
    var _a;
    const ply = env.game.live.ply;
    const fen2 = env.game.live.fen;
    const turn = env.game.live.turn;
    if (ply === 0) {
      const white = env.game.nameOf("white");
      const black = env.game.nameOf("black");
      this.trace.push(
        `
${white} vs ${black} ${env.game.speed} ${(_a = env.game.initial) != null ? _a : ""}${env.game.increment ? `-${env.game.increment}` : ""} ${env.game.live.initialFen}`,
        `
White: '${white}' ${env.bot.white ? this.stringify(env.bot.white) : ""}`,
        `Black: '${black}' ${env.bot.black ? this.stringify(env.bot.black) : ""}`
      );
    }
    if (ply % 2 === 0) this.trace.push(`
 ${"-".repeat(64)} Move ${ply / 2 + 1} ${"-".repeat(64)}`);
    if (!env.bot[turn]) this.trace.push(`  ${ply}. '${env.game.nameOf(turn)}' at '${fen2}': '${uci}'`);
  }
  afterMove(moveResult) {
    var _a, _b;
    const lastColor = env.game.live.awaiting;
    (_a = env.round.chessground) == null ? void 0 : _a.set({ animation: { enabled: !this.hurry } });
    if (this.hurry) moveResult.silent = true;
    const trace = (_b = env.bot[lastColor]) == null ? void 0 : _b.traceMove;
    if (trace) this.trace.push(trace);
  }
  onGameOver({ winner, reason, status }) {
    var _a, _b, _c, _d;
    const last = { winner, white: (_a = this.white) == null ? void 0 : _a.uid, black: (_b = this.black) == null ? void 0 : _b.uid };
    this.log.push(last);
    const matchup = `${env.game.live.id} '${env.game.nameOf("white")}' vs '${env.game.nameOf("black")}'`;
    const error = status === statusOf("unknownFinish") && `${matchup} - ${env.game.live.turn} ${reason} - ${env.game.live.fen} ${env.game.live.moves.join(" ")}`;
    const result = `${matchup}:${winner ? ` ${env.game.nameOf(winner)} wins by` : ""} ${status.name} ${reason != null ? reason : ""}`;
    this.trace.push(`
 ${error || result}
`, "=".repeat(144));
    this.traceDb(this.trace.join("\n"));
    this.trace = [];
    console.log(`game ${this.log.length} - ` + (error || result));
    if (error || !((_c = this.white) == null ? void 0 : _c.uid) || !((_d = this.black) == null ? void 0 : _d.uid)) return false;
    this.updateRatings(this.white.uid, this.black.uid, winner);
    if (this.script.type === "rate") {
      const uid = this.script.players[0];
      const rating = this.getRating(uid, env.game.speed);
      this.script.games.push(...rateBotMatchup(uid, rating, last));
    }
    if (this.testInProgress) return this.run();
    this.resetScript();
    env.redraw();
    return false;
  }
  getRating(uid, speed) {
    var _a, _b;
    if (!uid) return { r: 1500, rd: 350 };
    const bot = env.bot.info(uid);
    if (bot instanceof RateBot) return { r: bot.ratings[speed], rd: 0.01 };
    else return (_b = (_a = this.ratings[uid]) == null ? void 0 : _a[speed]) != null ? _b : { r: 1500, rd: 350 };
  }
  setRating(uid, speed, rating) {
    if (!uid || !env.bot.bots.has(uid)) return Promise.resolve();
    this.ratings[uid][speed] = rating;
    return this.localRatings.put(uid, this.ratings[uid]);
  }
  async getTrace() {
    return await this.traceDb.get() + "\n" + this.trace.join("\n");
  }
  get hasUser() {
    return !(this.white && this.black);
  }
  get gameInProgress() {
    return !!env.game.rewind || env.game.live.ply > 0 && !env.game.live.finished;
  }
  async clearRatings() {
    await this.localRatings.clear();
    this.ratings = {};
  }
  matchups(test, iterations = 1) {
    const players = test.players;
    if (players.length < 2) return [];
    if (test.type === "rate") {
      const rating = this.getRating(players[0], env.game.speed);
      return rateBotMatchup(players[0], rating);
    }
    const games = [];
    for (let it = 0; it < iterations; it++) {
      if (test.type === "roundRobin") {
        const tourney = [];
        for (let i = 0; i < players.length; i++) {
          for (let j = i + 1; j < players.length; j++) {
            tourney.push({ white: players[i], black: players[j] }, { white: players[j], black: players[i] });
          }
        }
        games.push(...shuffle(tourney));
      } else games.push({ white: test.players[it % 2], black: test.players[(it + 1) % 2] });
    }
    return games;
  }
  async getStoredRatings() {
    if (!this.localRatings)
      this.localRatings = await objectStorage({ store: "botdev.bot.ratings" });
    const keys = await this.localRatings.list();
    this.ratings = Object.fromEntries(
      await Promise.all(keys.map((k) => this.localRatings.get(k).then((v) => [k, v])))
    );
  }
  updateRatings(whiteUid, blackUid, winner) {
    const whiteScore = winner === "white" ? 1 : winner === "black" ? 0 : 0.5;
    const rats = [whiteUid, blackUid].map((uid) => this.getRating(uid, env.game.speed));
    return Promise.all([
      this.setRating(whiteUid, env.game.speed, updateGlicko(rats, whiteScore)),
      this.setRating(blackUid, env.game.speed, updateGlicko(rats.reverse(), 1 - whiteScore))
    ]);
    function updateGlicko(glk, score) {
      const q = Math.log(10) / 400;
      const expected = 1 / (1 + 10 ** ((glk[1].r - glk[0].r) / 400));
      const g = 1 / Math.sqrt(1 + 3 * q ** 2 * glk[1].rd ** 2 / Math.PI ** 2);
      const dSquared = 1 / (q ** 2 * g ** 2 * expected * (1 - expected));
      const deltaR = glk[0].rd <= 0 ? 0 : q * g * (score - expected) / (1 / dSquared + 1 / glk[0].rd ** 2);
      return {
        r: Math.round(glk[0].r + deltaR),
        rd: Math.max(30, Math.sqrt(1 / (1 / glk[0].rd ** 2 + 1 / dSquared)))
      };
    }
  }
  get white() {
    return env.bot.white;
  }
  get black() {
    return env.bot.black;
  }
  get testInProgress() {
    return this.script.games.length !== 0;
  }
  stringify(obj) {
    return JSON.stringify(obj, (_, v) => !obj ? "" : typeof v === "number" ? v.toFixed(2) : v);
  }
};

// ../../../../../node_modules/.pnpm/json-stringify-pretty-compact@4.0.0/node_modules/json-stringify-pretty-compact/index.js
var stringOrChar = /("(?:[^\\"]|\\.)*")|[:,]/g;
function stringify(passedObj, options = {}) {
  const indent = JSON.stringify(
    [1],
    void 0,
    options.indent === void 0 ? 2 : options.indent
  ).slice(2, -3);
  const maxLength = indent === "" ? Infinity : options.maxLength === void 0 ? 80 : options.maxLength;
  let { replacer } = options;
  return (function _stringify(obj, currentIndent, reserved) {
    if (obj && typeof obj.toJSON === "function") {
      obj = obj.toJSON();
    }
    const string = JSON.stringify(obj, replacer);
    if (string === void 0) {
      return string;
    }
    const length = maxLength - currentIndent.length - reserved;
    if (string.length <= length) {
      const prettified = string.replace(
        stringOrChar,
        (match, stringLiteral) => {
          return stringLiteral || `${match} `;
        }
      );
      if (prettified.length <= length) {
        return prettified;
      }
    }
    if (replacer != null) {
      obj = JSON.parse(string);
      replacer = void 0;
    }
    if (typeof obj === "object" && obj !== null) {
      const nextIndent = currentIndent + indent;
      const items = [];
      let index = 0;
      let start;
      let end;
      if (Array.isArray(obj)) {
        start = "[";
        end = "]";
        const { length: length2 } = obj;
        for (; index < length2; index++) {
          items.push(
            _stringify(obj[index], nextIndent, index === length2 - 1 ? 0 : 1) || "null"
          );
        }
      } else {
        start = "{";
        end = "}";
        const keys = Object.keys(obj);
        const { length: length2 } = keys;
        for (; index < length2; index++) {
          const key = keys[index];
          const keyPart = `${JSON.stringify(key)}: `;
          const value = _stringify(
            obj[key],
            nextIndent,
            keyPart.length + (index === length2 - 1 ? 0 : 1)
          );
          if (value !== void 0) {
            items.push(keyPart + value);
          }
        }
      }
      if (items.length > 0) {
        return [start, indent + items.join(`,
${nextIndent}`), end].join(
          `
${currentIndent}`
        );
      }
    }
    return string;
  })(passedObj, "", 0);
}

// ../botDev/src/assetDialog.ts
var mimeTypes = {
  image: ["image/jpeg", "image/png", "image/webp"],
  book: ["application/x-chess-pgn", "application/vnd.chess-pgn", "application/octet-stream", ".pgn"],
  sound: ["audio/mpeg", "audio/aac"]
};
var AssetDialog = class {
  constructor(type) {
    this.dragDrop = (e) => {
      var _a;
      e.preventDefault();
      if (e.type === "dragover") {
        e.dataTransfer.dropEffect = "copy";
        return;
      }
      const files = (_a = e.dataTransfer) == null ? void 0 : _a.files;
      if (files && files.length > 0) {
        const type = this.category(files[0].type);
        if (!type || this.resolve && type !== this.type) return;
        this.categories[type].process(files[0], (key) => {
          if (this.resolve) this.resolve(key);
          else this.update();
        });
      }
    };
    this.nameChange = (e) => {
      const el = e.target;
      const key = el.closest(".asset-item").getAttribute("data-asset");
      if (this.local.get(key) === el.value) return;
      if (this.validName(el.value)) env.assets.rename(this.type, key, el.value);
    };
    this.nameKeyDown = (e) => {
      var _a;
      const el = e.target;
      if (e.key === "Enter") {
        const key = el.closest(".asset-item").getAttribute("data-asset");
        const name = el.value;
        if (this.validName(name)) env.assets.rename(this.type, key, name);
        el.blur();
      } else if (e.key === "Escape") {
        const key = el.closest(".asset-item").getAttribute("data-asset");
        el.value = (_a = this.local.get(key)) != null ? _a : key;
        el.blur();
      }
    };
    this.delete = async (e) => {
      e.stopPropagation();
      const el = e.currentTarget.closest(".asset-item");
      const key = el.getAttribute("data-asset");
      if (!env.assets.isLocalOnly(key) && !await confirm("delete this asset from the server?")) return;
      await env.assets.delete(this.type, key);
      this.update();
    };
    this.push = async (e) => {
      var _a;
      e.stopPropagation();
      const el = e.currentTarget.closest(".asset-item");
      const key = el.dataset.asset;
      const name = (await domDialog({
        class: "alert",
        htmlText: `<div>push as: <input type="text" value="${(_a = this.local.get(key)) != null ? _a : key}"></div>
          <span><button class="button">upload</button></span>`,
        easyClose: "clickOutside",
        actions: {
          selector: "button",
          listener: async (_, dlg) => {
            const value = dlg.view.querySelector("input").value;
            if (!this.validName(value)) return;
            dlg.close(value);
          }
        },
        show: true
      })).returnValue;
      if (!name || name === "cancel") return key;
      try {
        await env.push.pushAsset(env.assets.assetBlob(this.type, key));
      } catch (x) {
        console.error("push failed", x);
        return void 0;
      }
      await env.assets.update();
      this.update();
      return name;
    };
    this.clickTab = (e) => {
      var _a, _b;
      const tab = e.currentTarget.closest(".tab");
      const type = (_a = tab == null ? void 0 : tab.textContent) == null ? void 0 : _a.slice(0, -1);
      if (!tab || type === this.type) return;
      this.dlg.view.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      this.type = (_b = tab.textContent) == null ? void 0 : _b.slice(0, -1);
      this.update();
    };
    this.clickItem = (e) => {
      var _a;
      const item = e.currentTarget.closest(".asset-item");
      const oldKey = item == null ? void 0 : item.getAttribute("data-asset");
      if (oldKey && this.isChooser) return (_a = this.resolve) == null ? void 0 : _a.call(this, oldKey);
    };
    this.addItem = () => {
      const fileInputEl = document.createElement("input");
      fileInputEl.type = "file";
      fileInputEl.accept = mimeTypes[this.type].join(",");
      fileInputEl.style.display = "none";
      const onchange = () => {
        fileInputEl.removeEventListener("change", onchange);
        if (!fileInputEl.files || fileInputEl.files.length < 1) return;
        this.active.process(fileInputEl.files[0], (key) => {
          if (this.resolve) this.resolve(key);
          else this.update();
        });
      };
      fileInputEl.addEventListener("change", onchange);
      this.dlg.view.append(fileInputEl);
      fileInputEl.click();
      fileInputEl.remove();
    };
    this.categories = {
      image: {
        placeholder: `<img src="/${env.assets.path}/image/gray-torso.webp">`,
        preview: (key) => frag(`<img src="${env.bot.getImageUrl(key)}">`),
        process: (file, onSuccess) => {
          if (!file.type.startsWith("image/")) return;
          site.asset.loadEsm("bits.cropDialog", {
            init: {
              aspectRatio: 1,
              source: file,
              max: { megabytes: 0.05, pixels: 512 },
              onCropped: (r) => {
                if (!(r instanceof Blob)) return;
                env.assets.import("image", file.name, r).then(onSuccess);
              }
            }
          });
        }
      },
      book: {
        placeholder: "",
        preview: (key) => {
          const divEl = document.createElement("div");
          const imgEl = document.createElement("img");
          imgEl.src = env.assets.getBookCoverUrl(key);
          divEl.append(imgEl);
          return divEl;
        },
        process: (file, onSuccess) => {
          if (file.type === "application/octet-stream" || file.name.endsWith(".bin")) {
            env.assets.importPolyglot(file.name, file).then(onSuccess);
          } else if (file.type.endsWith("chess-pgn") || file.name.endsWith(".pgn")) {
            const suggested = file.name.endsWith(".pgn") ? file.name.slice(0, -4) : file.name;
            domDialog({
              class: "dev-view import-dialog",
              htmlText: `<h2>import opening book</h2>
              <div class="options">
                <span>
                  <label>as: <input type="text" value="${suggested}" class="name" style="width: 160px"></label>
                  <label>max ply: <input type="text" value="8" class="ply" style="width: 50px"></label>
                </span>
                <button class="button" data-action="import">import</button>
              </div>
              <div class="progress none">
                <div class="bar"></div>
                <div class="text"></div>
                <button class="button button-empty button-red" data-action="cancel">cancel</button>
              </div>`,
              show: true,
              modal: true,
              focus: ".name",
              actions: [
                {
                  selector: ".options",
                  event: "keydown",
                  listener: (e) => {
                    var _a, _b;
                    if (!(e.target instanceof HTMLElement) || e.key !== "Enter") return;
                    e.preventDefault();
                    e.stopPropagation();
                    (_b = (_a = e.target.closest(".options")) == null ? void 0 : _a.querySelector('[data-action="import"]')) == null ? void 0 : _b.click();
                  }
                },
                { selector: '[data-action="cancel"]', result: "cancel" },
                {
                  selector: '[data-action="import"]',
                  listener: async (_, dlg) => {
                    const name = dlg.view.querySelector(".name").value;
                    const ply = Number(dlg.view.querySelector(".ply").value);
                    if (name.length < 4 || name.includes("/") || name.startsWith("."))
                      alert2(`bad name: ${name}`);
                    else if (!Number.isInteger(ply) || ply < 1 || ply > 16) alert2(`bad ply: ${ply}`);
                    else {
                      dlg.view.querySelector(".options").classList.add("none");
                      const progress2 = dlg.view.querySelector(".progress");
                      const bar = progress2.querySelector(".bar");
                      const text = progress2.querySelector(".text");
                      progress2.classList.remove("none");
                      const key = await env.assets.importPgn(
                        name,
                        file,
                        ply,
                        false,
                        (processed, total) => {
                          bar.style.width = `${processed / total * 100}%`;
                          processed = Math.round(processed / (1024 * 1024));
                          total = Math.round(total / (1024 * 1024));
                          text.textContent = `processed ${processed} out of ${total} MB`;
                          return dlg.dialog.open;
                        }
                      );
                      if (dlg.returnValue !== "cancel" && key) onSuccess(key);
                    }
                    dlg.close();
                  }
                }
              ]
            });
          }
        }
      },
      sound: {
        placeholder: "",
        preview: (key) => {
          const soundEl = document.createElement("span");
          const audioEl = frag(`<audio src="${env.bot.getSoundUrl(key)}"></audio>`);
          const buttonEl = frag(
            `<button class="button button-empty preview-sound" data-icon="${licon.PlayTriangle}" data-play="${key}">0.00s</button>`
          );
          buttonEl.addEventListener("click", (e) => {
            audioEl.play();
            e.stopPropagation();
          });
          soundEl.append(audioEl);
          soundEl.append(buttonEl);
          audioEl.onloadedmetadata = () => {
            buttonEl.textContent = audioEl.duration.toFixed(2) + "s";
          };
          return soundEl;
        },
        process: (file, onSuccess) => {
          if (!file.type.startsWith("audio/")) return;
          env.assets.import("sound", file.name, file).then(onSuccess);
        }
      }
    };
    if (!type || type === "image") wireCropDialog();
    this.isChooser = type !== void 0;
    this.type = type != null ? type : "image";
  }
  get active() {
    return this.categories[this.type];
  }
  get local() {
    return env.assets.localKeyNames(this.type);
  }
  get server() {
    return env.assets.serverKeyNames(this.type);
  }
  show() {
    return new Promise(
      (resolve) => (async () => {
        if (this.isChooser)
          this.resolve = (key) => {
            resolve(key);
            this.resolve = void 0;
            this.dlg.close();
          };
        this.dlg = await domDialog({
          class: `dev-view asset-dialog${this.isChooser ? " chooser" : ""}`,
          htmlText: this.bodyHtml(),
          easyClose: "clickOutside",
          onClose: () => {
            var _a;
            return (_a = this.resolve) == null ? void 0 : _a.call(this, void 0);
          },
          actions: [
            { event: ["dragover", "drop"], listener: this.dragDrop },
            { selector: '[data-action="add"]', listener: this.addItem },
            { selector: '[data-action="remove"]', listener: this.delete },
            { selector: '[data-action="push"]', listener: this.push },
            { selector: '[data-type="string"]', event: "keydown", listener: this.nameKeyDown },
            { selector: '[data-type="string"]', event: "change", listener: this.nameChange },
            { selector: ".asset-item", listener: this.clickItem },
            { selector: ".tab", listener: this.clickTab }
          ]
        });
        this.update();
        this.dlg.show();
      })()
    );
  }
  update(type) {
    if (type && type !== this.type) return;
    const grid = this.dlg.view.querySelector(".asset-grid");
    grid.innerHTML = `<div class="asset-item local-only" data-action="add">
        <div class="asset-preview">${this.active.placeholder}</div>
        <div class="asset-label">Add new ${this.type}</div>
      </div></div>`;
    this.local.forEach((name, key) => grid.append(this.renderAsset([key, name])));
    this.server.forEach((name, key) => !name.startsWith(".") && grid.append(this.renderAsset([key, name])));
    this.dlg.updateActions();
  }
  bodyHtml() {
    if (this.isChooser) return `<div class="asset-grid chooser"></div>`;
    return `<div class="tabs-horiz" role="tabList">
        <span class="tab ${this.type === "image" ? "active" : ""}" role="tab">images</span>
        <span class="tab ${this.type === "sound" ? "active" : ""}" role="tab">sounds</span>
        <span class="tab ${this.type === "book" ? "active" : ""}" role="tab">books</span>
      </div>
      <div class="asset-grid"></div>`;
  }
  renderAsset([key, name]) {
    const localOnly = env.assets.isLocalOnly(key);
    const wrap = frag(`<div class="asset-item${localOnly ? " local-only" : ""}" data-asset="${key}">
        <div class="asset-preview"></div>
        <input type="text" class="asset-label" data-type="string" value="${name}" ${this.isChooser || !env.canPost ? " disabled" : ""} spellcheck="false" />
      </div>`);
    if (!this.isChooser) {
      if (localOnly || env.canPost) wrap.append(renderRemoveButton("upper-right"));
      if (localOnly && env.canPost) {
        wrap.append(
          frag(
            `<button class="button button-empty icon-btn upper-left" tabindex="0" data-icon="${licon.UploadCloud}" data-action="push" title="upload asset to server">`
          )
        );
      }
    }
    wrap.querySelector(".asset-preview").prepend(this.active.preview(key));
    return wrap;
  }
  validName(name) {
    const error = name.length < 3 ? "name must be three characters or more" : name.includes("/") ? "name cannot contain /" : name.startsWith(".") ? "name cannot start with period" : [...this.server.values()].includes(name) ? "that name is already in use" : void 0;
    if (error) alert2(error);
    return error === void 0;
  }
  category(mimeType) {
    var _a;
    for (const type in mimeTypes)
      if ((_a = mimeTypes[type]) == null ? void 0 : _a.includes(mimeType)) return type;
    return void 0;
  }
};

// ../botDev/src/historyDialog.ts
var import_fast_diff = __toESM(require_diff());
async function historyDialog(host, uid) {
  const dlg = new HistoryDialog(host, uid);
  await dlg.show();
}
var HistoryDialog = class {
  constructor(host, uid) {
    this.host = host;
    this.uid = uid;
    this.clickItem = async (e) => {
      this.select(this.version(e.target.dataset.version));
    };
    this.mouseEnterItem = async (e) => {
      var _a;
      this.json(this.version((_a = e.target) == null ? void 0 : _a.dataset.version));
    };
    this.copy = async () => {
      var _a;
      await navigator.clipboard.writeText(stringify(this.selected));
      const copied = frag(`<div data-icon="${licon.Checkmark}" class="good"> COPIED</div>`);
      (_a = this.view.querySelector('[data-action="copy"]')) == null ? void 0 : _a.before(copied);
      setTimeout(() => copied.remove(), 2e3);
    };
    this.pull = async () => {
      await env.bot.storeBot(this.selected);
      await this.updateHistory();
      this.select();
      this.host.update();
    };
    this.push = async () => {
      const err = await env.push.pushBot(this.selected);
      if (err) {
        alert(`push failed: ${escapeHtml(err)}`);
        return;
      }
      await this.updateHistory();
      this.select();
      this.host.update();
    };
  }
  async show() {
    this.view = frag(`<div class="dev-view history-dialog">
        <div class="versions"></div>
        <div class="json"></div>
        <div class="actions">
          <button class="button button-empty" data-action="pull">pull</button>
          <button class="button button-empty button-clas" data-action="push">push</button>
        </div>
        <div class="actions">
          <button class="button button-empty button-dim" data-icon="${licon.Clipboard}" data-action="copy"></button>
        </div>
      </div>`);
    await this.updateHistory();
    this.dlg = await domDialog({
      insert: [{ nodes: this.view }],
      easyClose: "clickOutside",
      actions: [
        { selector: '[data-action="pull"]', listener: this.pull },
        { selector: '[data-action="push"]', listener: this.push },
        { selector: ".version", listener: this.clickItem },
        { selector: ".version", event: "mouseenter", listener: this.mouseEnterItem },
        { selector: ".version", event: "mouseleave", listener: () => this.json() },
        { selector: '[data-action="copy"]', listener: this.copy }
      ]
    });
    this.select(this.versions[this.versions.length - 1]);
    this.dlg.show();
    const versionsEl = this.view.querySelector(".versions");
    versionsEl.scrollTop = versionsEl.scrollHeight;
    return this;
  }
  async updateHistory() {
    var _a, _b;
    const history = await (await fetch("/bots/dev/history?id=" + encodeURIComponent(this.uid))).json();
    this.versions = history.bots.reverse();
    if (env.bot.localBots[this.uid])
      this.versions.push({
        ...env.bot.localBots[this.uid],
        version: "local",
        author: (_a = myUserId()) != null ? _a : "anonymous"
      });
    const versionsEl = this.view.querySelector(".versions");
    versionsEl.innerHTML = "";
    for (const bot of this.versions) {
      const isLive = bot === env.bot.localBots[this.host.uid] || bot === this.versions[this.versions.length - 1];
      const version = bot.version;
      const div = frag(
        `<div class="version${isLive ? " selected" : ""}" data-version="${version}">`
      );
      const versionStr = typeof version === "number" ? `#${version}` : version;
      const span = frag(`<span class="author">${bot.author}</span>`);
      if (isLive) span.appendChild(frag(`<icon data-icon="${licon.Checkmark}" class="live">`));
      div.append(frag(`<span class="version-number">${versionStr}</span>`), span);
      versionsEl.append(div);
    }
    versionsEl.scrollTop = versionsEl.scrollHeight;
    (_b = this.dlg) == null ? void 0 : _b.updateActions();
  }
  select(bot = this.selected) {
    var _a, _b, _c, _d;
    (_a = this.view.querySelector('[data-action="pull"]')) == null ? void 0 : _a.classList.toggle("none", bot && bot === this.live);
    (_b = this.view.querySelector('[data-action="push"]')) == null ? void 0 : _b.classList.toggle("none", !env.canPost || (bot == null ? void 0 : bot.version) !== "local");
    if (!bot) return;
    (_c = this.view.querySelectorAll(".version")) == null ? void 0 : _c.forEach((v) => v.classList.remove("selected"));
    (_d = this.versionEl(bot.version)) == null ? void 0 : _d.classList.add("selected");
    this.json(bot);
  }
  version(version) {
    if (!version) return void 0;
    return this.versions.find((b) => String(b.version) === String(version));
  }
  versionEl(version) {
    return this.view.querySelector(`.version[data-version="${version}"]`);
  }
  get selected() {
    const selected = this.view.querySelector(".version.selected");
    return selected && this.versions.find((b) => String(b.version) === selected.dataset.version);
  }
  get live() {
    return this.versions[this.versions.length - 1];
  }
  json(hover) {
    const json = this.view.querySelector(".json");
    json.innerHTML = "";
    const changes = (0, import_fast_diff.default)(
      stringify(this.selected, { indent: 2, maxLength: 80 }),
      stringify(hover != null ? hover : this.selected, { indent: 2, maxLength: 80 })
    );
    for (const change of changes) {
      const span = frag(`<span>${change[1]}</span>`);
      if (change[0] === 1) span.classList.add("hovered");
      else if (change[0] === -1) span.classList.add("selected");
      json.append(span);
    }
  }
};

// ../botDev/src/schema.ts
var infoKeys = [
  "type",
  "id",
  "label",
  "value",
  "placeholder",
  "assetType",
  "class",
  "choices",
  "title",
  "min",
  "max",
  "step",
  "rows",
  "template",
  "requires",
  "toggle"
];
var requiresOpRe = /==|>=|>|<<=|<=|<|!=/;
var base = {
  info: {
    description: {
      type: "textarea",
      rows: 3,
      class: ["placard"],
      placeholder: "short, public description"
    },
    name: {
      type: "text",
      label: "name",
      class: ["setting"],
      placeholder: "bot name"
    },
    ratings: {
      label: "advertised rating",
      type: "group",
      toggle: false,
      ultraBullet: {
        label: "ultra bullet",
        type: "range",
        class: ["setting"],
        value: 1500,
        min: 600,
        max: 2400,
        step: 10,
        toggle: true
      },
      bullet: {
        label: "bullet",
        type: "range",
        class: ["setting"],
        value: 1500,
        min: 600,
        max: 2400,
        step: 10,
        toggle: true
      },
      blitz: {
        label: "blitz",
        type: "range",
        class: ["setting"],
        value: 1500,
        min: 600,
        max: 2400,
        step: 10,
        toggle: true
      },
      rapid: {
        label: "rapid",
        type: "range",
        class: ["setting"],
        value: 1500,
        min: 600,
        max: 2400,
        step: 10,
        toggle: true
      },
      classical: {
        label: "classical",
        type: "range",
        class: ["setting"],
        value: 1500,
        min: 600,
        max: 2400,
        step: 10,
        toggle: true
      }
    }
  },
  behavior: {
    class: ["behavior"],
    books: {
      label: "books",
      type: "books",
      class: ["books"],
      template: {
        min: { weight: 0 },
        max: { weight: 100 },
        step: { weight: 1 },
        value: { weight: 1 }
      },
      title: `opening books may be imported into the asset databas from pgns, studies, or polyglot files.

once imported, you may add any number of different opening books to a bot. the weight of a book is used to choose one when multiple books offer moves for the same position. a book with a weight of 10 is 10 times more likely to be selected than one with a weight of 1. a weight of 0 will disable a book without removing it`
    },
    sounds: {
      label: "sounds",
      type: "sounds",
      class: ["sound-events"],
      template: {
        min: { chance: 0, delay: 0, mix: 0 },
        max: { chance: 100, delay: 10, mix: 1 },
        step: { chance: 0.1, delay: 0.1, mix: 0.01 },
        value: { chance: 100, delay: 0, mix: 0.5 }
      },
      greeting: { label: "greeting", class: ["sound-event"], type: "soundEvent" },
      playerWin: { label: "player win", class: ["sound-event"], type: "soundEvent" },
      botWin: { label: "bot win", class: ["sound-event"], type: "soundEvent" },
      playerCheck: { label: "player check", class: ["sound-event"], type: "soundEvent" },
      botCheck: { label: "bot check", class: ["sound-event"], type: "soundEvent" },
      playerCapture: { label: "player capture", class: ["sound-event"], type: "soundEvent" },
      botCapture: { label: "bot capture", class: ["sound-event"], type: "soundEvent" },
      playerMove: { label: "player move", class: ["sound-event"], type: "soundEvent" },
      botMove: { label: "bot move", class: ["sound-event"], type: "soundEvent" }
    },
    zero: {
      label: "lc0",
      type: "group",
      toggle: true,
      net: {
        label: "model",
        type: "select",
        class: ["setting"],
        assetType: "net"
      },
      multipv: {
        label: "lines",
        type: "range",
        class: ["setting"],
        value: 1,
        min: 1,
        max: 8,
        step: 1
      },
      nodes: {
        label: "nodes",
        type: "range",
        class: ["setting"],
        value: 1,
        min: 1,
        max: 1e3,
        step: 1,
        toggle: true,
        requires: {
          some: [
            "behavior_zero_net <<= e55a",
            // tinygyal
            "behavior_zero_net <<= 2d2e",
            // evilgyal
            "behavior_zero_net <<= d685",
            // goodgyal
            "behavior_zero_net <<= b5d2"
            // meangyal
          ]
        }
      }
    },
    fish: {
      label: "stockfish",
      type: "group",
      toggle: true,
      multipv: {
        label: "lines",
        type: "range",
        class: ["setting"],
        value: 12,
        min: 1,
        max: 20,
        step: 1
      },
      depth: {
        label: "depth",
        type: "range",
        class: ["setting"],
        value: 10,
        min: 1,
        max: 14,
        step: 1
      }
    }
  },
  bot_filters: {
    class: ["filters"],
    lc0bias: {
      label: "lc0 bias",
      type: "filter",
      class: ["filter"],
      value: { range: { min: 0, max: 1 }, by: "max" },
      requires: { every: ["behavior_zero", "behavior_fish"] },
      title: `this filter assigns a weight in order to bias moves from the lc0 engine. a higher weight makes a move more likely to be selected.

if the engine is configured to return multiple lines, the same bias is applied to every move, but the order lc0 prefers them is still respected.

generally, moves are preferred in descending order of the sum of their weights. so lc0 bias can compensate for (by adding to) weights from other filters`
    },
    cplTarget: {
      label: "cpl target",
      type: "filter",
      class: ["filter"],
      value: { range: { min: 0, max: 150 }, by: "max" },
      requires: { every: ["behavior_fish", "behavior_fish_multipv > 1"] },
      title: `cpl target assigns a weight calculated from the average centipawn loss relative to bestmove according to stockfish at the chosen depth.

it identifies the mean of a folded normal distribution of target cpl values. 

each turn, a randomized cpl target is chosen from this distribution. the distance from a move's actual cpl to this randomized target is converted to a weight between 0 and 1 with a sigmoid function.

moves are sorted in descending order by the sum of their weights (lc0 bias and/or cpl).`
    },
    cplStdev: {
      label: "cpl stdev",
      type: "filter",
      class: ["filter"],
      value: { range: { min: 0, max: 100 }, by: "max" },
      requires: "bot_filters_cplTarget",
      title: `cpl stdev, if given, describes the standard deviation of the folded normal distribution from which each move's random cpl target is chosen. if not given, it defaults to 50. cpl stdev participates in the cpl target weight calculation. it does not assign its own weight.`
    }
  }
};
var lastFilter = [
  "moveDecay",
  {
    info: {
      label: "move quality decay",
      type: "filter",
      class: ["filter"],
      value: { range: { min: 0, max: 1 }, by: "max" },
      requires: {
        some: [
          "behavior_fish_multipv > 1",
          "behavior_zero_multipv > 1",
          { every: ["behavior_zero", "behavior_fish"] }
        ]
      },
      title: `move quality decay is an optional final stage of move selection.

if any previous filter assigns weights, they are first used to sort moves in descending order of the weight sums. when move quality decay is off or zero, the first move in that sort order is chosen. if move quality decay is non-zero, each move's quality weight is equal to that decay raised to the power of the move's sort order index (counting from zero). a random number between 0 and the sum of all quality weights will then select the final move.

for example, with a decay of 0.5, the first move has a 50% chance of being chosen, the second move 25%, the third 12.5%, and so on. with a decay of 1, all moves are equally likely (ultrabullet).

move quality decay is engine independent and can be used to resolve between scored stockfish and unscored lc0 moves. it operates on the full list provided by both engines and pairs well with the think time facet and a crisp chardonnay.`
    }
  }
];
var schema = memoize(() => {
  const withFilters = structuredClone(base);
  const filterEntries = [...Bot.registeredFilters(), lastFilter];
  Object.defineProperties(
    withFilters.bot_filters,
    Object.fromEntries(
      filterEntries.map(([key, { info }]) => [key, { enumerable: true, value: structuredClone(info) }])
    )
  );
  return deepFreeze(withFilters);
});
function getSchemaDefault(id) {
  var _a;
  const setting = (_a = schema()[id]) != null ? _a : id.split("_").reduce((obj, key) => obj[key], schema());
  return typeof setting === "object" && "value" in setting ? setting.value : void 0;
}

// ../botDev/src/pane.ts
var Pane = class {
  constructor(args) {
    var _a, _b, _c;
    Object.assign(this, args);
    this.el = document.createElement(this.isFieldset ? "fieldset" : "div");
    this.el.id = this.id;
    (_a = this.info.class) == null ? void 0 : _a.forEach((c) => this.el.classList.add(c));
    this.host.panes.add(this);
    if (this.info.title) this.el.title = this.info.title;
    if (this.info.label) {
      this.label = frag(`<label><span>${this.info.label}</span></label>`);
      if ((_b = this.info.class) == null ? void 0 : _b.includes("setting")) this.el.appendChild(this.label);
      else {
        const header = document.createElement(this.isFieldset ? "legend" : "span");
        header.appendChild(this.label);
        this.el.appendChild(header);
      }
    }
    const toggleInputEl = this.radioGroup ? frag(`<input type="radio" class="toggle" name="${this.radioGroup}" tabindex="-1">`) : this.isOptional && this.info.label && this.info.type !== "books" && this.info.type !== "soundEvent" ? frag(`<input type="checkbox" class="toggle">`) : void 0;
    if (!toggleInputEl) return;
    toggleInputEl.checked = this.isDefined;
    (_c = this.label) == null ? void 0 : _c.prepend(toggleInputEl);
    this.toggle = (v) => {
      if (v !== void 0) toggleInputEl.checked = v;
      return toggleInputEl.checked;
    };
  }
  setEnabled(enabled = this.canEnable) {
    var _a, _b;
    const allowed = this.requirementsAllow;
    if (!allowed) enabled = false;
    this.el.classList.toggle("none", !allowed);
    if (this.input || this.toggle) {
      const { panes: editor, view } = this.host;
      this.el.classList.toggle("disabled", !enabled);
      if (enabled) this.host.editing().disabled.delete(this.id);
      else this.host.editing().disabled.add(this.id);
      if (this.input && !this.input.value)
        this.input.value = this.getStringProperty(["scratch", "local", "server", "schema"]);
      for (const kid of this.children) {
        kid.el.classList.toggle("none", !enabled || !kid.requirementsAllow);
        if (!enabled) continue;
        if (!kid.isOptional) kid.update();
        else if (kid.info.type !== "radioGroup") continue;
        const radios = Object.values(editor.byId).filter((x) => x.radioGroup === kid.id);
        const active = (_a = radios == null ? void 0 : radios.find((x) => x.enabled)) != null ? _a : radios == null ? void 0 : radios.find((x) => x.getProperty(["local", "server"]));
        if (active) active.update();
        else if (radios.length) radios[0].update();
      }
      (_b = this.toggle) == null ? void 0 : _b.call(this, enabled);
      if (this.radioGroup && enabled)
        view.querySelectorAll(`[name="${this.radioGroup}"]`).forEach((el) => {
          const radio = editor.byEl(el);
          if (radio === this) return;
          radio == null ? void 0 : radio.setEnabled(false);
        });
    }
    for (const r of this.host.panes.dependsOn(this.id)) r.setEnabled();
    return enabled;
  }
  update(_) {
    this.setProperty(this.paneValue);
    this.setEnabled(this.isDefined);
    this.host.update();
  }
  setProperty(value) {
    if (value === void 0) {
      if (this.paneValue) removeObjectProperty({ obj: this.host.editing(), path: { id: this.id } });
    } else setObjectProperty({ obj: this.host.editing(), path: { id: this.id }, value });
  }
  getProperty(from = ["scratch"]) {
    return findMap(
      from,
      (src) => src === "schema" ? getSchemaDefault(this.id) : this.path.reduce(
        (o, key) => o == null ? void 0 : o[key],
        src === "scratch" ? this.host.editing() : src === "local" ? this.host.localBot : this.host.serverBot
      )
    );
  }
  getStringProperty(src = ["scratch"]) {
    const prop = this.getProperty(src);
    return typeof prop === "object" ? JSON.stringify(prop) : prop !== void 0 ? String(prop) : "";
  }
  get paneValue() {
    var _a;
    return (_a = this.input) == null ? void 0 : _a.value;
  }
  get id() {
    return this.info.id;
  }
  get enabled() {
    if (this.isDisabled) return false;
    const kids = this.children;
    if (!kids.length) return this.isDefined && this.requirementsAllow;
    return kids.every((x) => x.enabled || x.isOptional);
  }
  get requires() {
    return getRequirementIds(this.info.requires);
  }
  init() {
    this.setEnabled();
    if (this.input) this.el.appendChild(this.input);
  }
  get path() {
    return this.id.split("_").slice(1);
  }
  get radioGroup() {
    var _a;
    return ((_a = this.parent) == null ? void 0 : _a.info.type) === "radioGroup" ? this.parent.id : void 0;
  }
  get isFieldset() {
    return this.info.type === "group" || this.info.type === "books" || this.info.type === "sounds";
  }
  get isDefined() {
    return this.getProperty() !== void 0;
  }
  get isDisabled() {
    var _a, _b, _c;
    return (_c = (_b = this.host.editing().disabled.has(this.id)) != null ? _b : (_a = this.parent) == null ? void 0 : _a.isDisabled) != null ? _c : false;
  }
  get children() {
    if (!this.id) return [];
    return Object.keys(this.host.panes.byId).filter((id) => id.startsWith(this.id) && id.split("_").length === this.id.split("_").length + 1).map((id) => this.host.panes.byId[id]);
  }
  get isOptional() {
    return this.info.toggle === true;
  }
  get requirementsAllow() {
    var _a;
    return !((_a = this.parent) == null ? void 0 : _a.isDisabled) && this.evaluate(this.info.requires);
  }
  get canEnable() {
    const kids = this.children;
    if (this.input && !kids.length) return this.isDefined;
    return kids.every((x) => x.enabled || x.isOptional) && this.requirementsAllow;
  }
  evaluate(requirement) {
    var _a;
    if (typeof requirement === "string") {
      const req = requirement.trim();
      if (req.startsWith("!")) {
        const paneId = req.slice(1).trim();
        const pane = this.host.panes.byId[paneId];
        return pane ? !pane.enabled : true;
      }
      const op = (_a = req.match(requiresOpRe)) == null ? void 0 : _a[0];
      const [left, right] = req.split(op).map((x) => x.trim());
      if ([left, right].some((x) => {
        var _a2;
        return (_a2 = this.host.panes.byId[x]) == null ? void 0 : _a2.enabled;
      })) return false;
      const maybeLeftPane = this.host.panes.byId[left];
      const maybeRightPane = this.host.panes.byId[right];
      const leftValue = maybeLeftPane ? maybeLeftPane.paneValue : left;
      const rightValue = maybeRightPane ? maybeRightPane.paneValue : right;
      switch (op) {
        case "==":
          return String(leftValue) === String(rightValue);
        case "!=":
          return String(leftValue) !== String(rightValue);
        case "<<=":
          return String(leftValue).startsWith(String(rightValue));
        case ">=":
          return Number(leftValue) >= Number(rightValue);
        case ">":
          return Number(leftValue) > Number(rightValue);
        case "<=":
          return Number(leftValue) <= Number(rightValue);
        case "<":
          return Number(leftValue) < Number(rightValue);
        default:
          return maybeLeftPane == null ? void 0 : maybeLeftPane.enabled;
      }
    } else if (Array.isArray(requirement)) {
      return requirement.every((r) => this.evaluate(r));
    } else if (typeof requirement === "object") {
      if ("every" in requirement) {
        return requirement.every.every((r) => this.evaluate(r));
      } else if ("some" in requirement) {
        return requirement.some.some((r) => this.evaluate(r));
      }
    }
    return true;
  }
};
var SelectSetting = class extends Pane {
  constructor(p) {
    super(p);
    this.input = frag('<select data-type="string">');
    for (const c of this.choices) {
      const option = document.createElement("option");
      option.value = c.value;
      option.textContent = c.name;
      if (option.value === this.getStringProperty()) option.selected = true;
      this.input.appendChild(option);
    }
    this.el.appendChild(document.createElement("hr"));
    this.init();
  }
  get choices() {
    var _a;
    if (!this.info.assetType) return (_a = this.info.choices) != null ? _a : [];
    return [...env.assets.allKeyNames(this.info.assetType).entries()].map(([key, name]) => ({
      name,
      value: key
    }));
  }
  get paneValue() {
    return this.input.value;
  }
};
var TextSetting = class extends Pane {
  constructor(p) {
    super(p);
    this.input = frag(
      '<input type="text" data-type="string" spellcheck="false">'
    );
    this.init();
    if (this.info.placeholder) this.input.setAttribute("placeholder", this.info.placeholder);
  }
  get paneValue() {
    var _a;
    return (_a = this.input.value) != null ? _a : "";
  }
};
var TextareaSetting = class extends Pane {
  constructor(p) {
    super(p);
    this.input = frag('<textarea data-type="string" spellcheck="false">');
    this.init();
    if (this.info.placeholder) this.input.setAttribute("placeholder", this.info.placeholder);
  }
  get paneValue() {
    var _a;
    return (_a = this.input.value) != null ? _a : "";
  }
};
var NumberSetting = class extends Pane {
  constructor(p) {
    super(p);
    this.input = frag('<input type="text" data-type="number">');
    this.el.appendChild(document.createElement("hr"));
    this.init();
    this.input.maxLength = maxChars(this.info);
    this.input.style.maxWidth = `calc(${maxChars(this.info)}ch + 1.5em)`;
    if (this.info.min === this.info.max) this.input.disabled = true;
  }
  update() {
    const isValid = this.isValid();
    this.input.classList.toggle("invalid", !isValid);
    if (isValid) {
      this.setProperty(this.paneValue);
      this.setEnabled(true);
    }
  }
  isValid(el = this.input) {
    const v = Number(el.value);
    return !isNaN(v) && v >= this.info.min && v <= this.info.max;
  }
  get paneValue() {
    return this.isValid() ? Number(this.input.value) : void 0;
  }
};
var RangeSetting = class extends NumberSetting {
  constructor(p) {
    var _a;
    super(p);
    this.rangeInput = frag('<input type="range" data-type="number">');
    this.rangeInput.min = String(this.info.min);
    this.rangeInput.max = String(this.info.max);
    this.rangeInput.step = String(this.info.step);
    this.rangeInput.value = this.input.value;
    (_a = this.el.querySelector("hr")) == null ? void 0 : _a.replaceWith(this.rangeInput);
  }
  update(e) {
    if (!e || e.target === this.input) {
      super.update();
      this.rangeInput.value = this.input.value;
      return;
    }
    this.input.value = this.rangeInput.value;
    this.input.classList.remove("invalid");
    this.setProperty(Number(this.input.value));
    this.setEnabled(true);
  }
};
function getRequirementIds(r) {
  if (typeof r === "string") {
    const req = r.trim();
    if (req.startsWith("!")) return [req.slice(1).trim()];
    const [left, right] = req.split(requiresOpRe).map((x) => x.trim());
    const ids = [];
    if (left && isNaN(Number(left))) ids.push(left);
    if (right && isNaN(Number(right))) ids.push(right);
    return ids;
  } else if (Array.isArray(r)) {
    return r.flatMap(getRequirementIds);
  } else if (typeof r === "object" && r !== null) {
    if ("every" in r) return r.every.flatMap(getRequirementIds);
    if ("some" in r) return r.some.flatMap(getRequirementIds);
  }
  return [];
}
function findMap(arr, fn) {
  for (const v of arr) {
    const result = fn(v);
    if (result !== void 0) return result;
  }
  return void 0;
}

// ../botDev/src/booksPane.ts
var BooksPane = class extends Pane {
  constructor(p) {
    var _a;
    super(p);
    (_a = this.label) == null ? void 0 : _a.prepend(
      frag(`<icon role="button" tabindex="0" data-icon="${licon.PlusButton}" data-action="add">`)
    );
    this.template = {
      type: "range",
      class: ["setting", "book"],
      ...Object.fromEntries(Object.entries(p.info.template).map(([k, v]) => [k, v.weight]))
    };
    if (!this.value) this.setProperty([]);
    this.value.forEach((_, index) => this.makeBook(index));
  }
  update(e) {
    if (!((e == null ? void 0 : e.target) instanceof HTMLElement)) return;
    if (e.target.dataset.action === "add") {
      this.host.assetDialog("book").then((b) => {
        var _a, _b;
        if (!b) return;
        this.value.push({ key: b, weight: (_b = (_a = this.template) == null ? void 0 : _a.value) != null ? _b : 1 });
        this.makeBook(this.value.length - 1);
      });
    }
  }
  setWeight(pane, value) {
    this.value[this.index(pane)].weight = value;
  }
  getWeight(pane) {
    var _a, _b;
    const index = this.index(pane);
    return index === -1 ? void 0 : (_b = (_a = this.value[index]) == null ? void 0 : _a.weight) != null ? _b : 1;
  }
  setColor(pane, color) {
    this.value[this.index(pane)].color = color;
    this.host.update();
  }
  getColor(pane) {
    var _a;
    return (_a = this.value[this.index(pane)]) == null ? void 0 : _a.color;
  }
  setEnabled() {
    this.el.classList.toggle("disabled", !this.value.length);
    return true;
  }
  removeBook(pane) {
    this.value.splice(this.index(pane), 1);
    this.setEnabled();
  }
  index(pane) {
    return this.bookEls.indexOf(pane.el);
  }
  makeBook(index) {
    var _a;
    const book = this.value[index];
    const pargs = {
      host: this.host,
      info: {
        ...this.template,
        label: (_a = env.assets.nameOf(book.key)) != null ? _a : `unknown '${book.key}'`,
        value: book.weight,
        color: book.color,
        id: `${this.id}_${idCounter++}`
      },
      parent: this
    };
    this.el.appendChild(new BookPane(pargs, book.key).el);
    this.setEnabled();
    this.host.update();
  }
  get value() {
    return this.getProperty();
  }
  get bookEls() {
    return [...this.el.querySelectorAll(".book")];
  }
};
var idCounter = 0;
var BookPane = class extends RangeSetting {
  constructor(p, key) {
    super(p);
    this.colorInput = frag(
      `<div class="btn-rack" title="colors for this book">
      <button data-color="black"></button>
      <button data-color="white"></button>
    </div>`
    );
    this.colorInput.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", (e) => {
        if (!(e.target instanceof HTMLElement)) return;
        const color = e.target.dataset.color;
        const other = this.colorInput.querySelector(`button[data-color="${opposite(color)}"]`);
        if (e.target.classList.contains("active")) other == null ? void 0 : other.classList.toggle("active");
        e.target.classList.add("active");
        this.parent.setColor(this, (other == null ? void 0 : other.classList.contains("active")) ? void 0 : color);
      });
    });
    this.colorInput.querySelectorAll(p.info.color ? `button[data-color="${p.info.color}"]` : "button").forEach((b) => b.classList.add("active"));
    this.el.append(this.colorInput);
    this.el.append(renderRemoveButton());
    this.label.append(frag(`<img src="${env.assets.getBookCoverUrl(key)}">`));
    this.label.title = "";
    this.rangeInput.insertAdjacentHTML("afterend", "wt");
  }
  getProperty() {
    var _a, _b;
    return (_b = (_a = this.parent.getWeight(this)) != null ? _a : this.info.value) != null ? _b : 1;
  }
  setProperty(value) {
    this.parent.setWeight(this, value);
  }
  update(e) {
    if (!((e == null ? void 0 : e.target) instanceof HTMLElement)) return;
    if (e.target.dataset.action === "remove") {
      this.parent.removeBook(this);
      this.el.remove();
      this.host.update();
    } else super.update(e);
  }
};

// ../botDev/src/filterPane.ts
var FilterPane = class extends Pane {
  constructor(p) {
    var _a, _b;
    super(p);
    this.facets = {};
    this.toggleFacet = (facet, checked) => {
      var _a, _b;
      if (checked) this.facets[facet].input.checked = checked;
      else checked = this.facets[facet].input.checked;
      if (checked) {
        this.host.editing().disabled.delete(`${this.id}_${facet}`);
        (_b = (_a = this.paneValue)[facet]) != null ? _b : _a[facet] = [];
      } else this.host.editing().disabled.add(`${this.id}_${facet}`);
      return checked;
    };
    if (!this.isDefined) this.setProperty(structuredClone(this.info.value));
    if (this.info.title && this.label) this.label.title = this.info.title;
    this.el.title = "";
    this.input = document.createElement("select");
    this.input.title = "move / score / time function combinator";
    this.input.append(
      ...filterBys.map(
        (c) => frag(`<option ${c === this.paneValue.by ? "selected " : ""}value="${c}">${c}</option>`)
      )
    );
    this.input.addEventListener("change", (e) => {
      this.paneValue.by = e.target.value;
      super.update();
    });
    (_a = this.label) == null ? void 0 : _a.append(this.input);
    const tabs = frag(`<div class="btn-rack"></div>`);
    for (const facet of filterFacetKeys) {
      this.facets[facet] = this.makeFacet(facet);
      tabs.append(this.facets[facet].el);
    }
    (_b = this.el.firstElementChild) == null ? void 0 : _b.append(tabs);
    this.graphEl = frag(`<div class="graph-wrapper"><canvas></canvas></div>`);
    this.el.append(this.graphEl);
    this.host.janitor.addCleanupTask(() => {
      var _a2;
      return (_a2 = this.graph) == null ? void 0 : _a2.destroy();
    });
  }
  setEnabled(enabled) {
    var _a;
    if (this.requirementsAllow) enabled != null ? enabled : enabled = !this.isOptional || this.isDefined && !this.isDisabled;
    else enabled = false;
    let enabledFacets = 0;
    for (const [facet, facetPane] of Object.entries(this.facets)) {
      facetPane.el.classList.toggle("active", enabled && facet === this.viewing && facetPane.input.checked);
      if (facetPane.input.checked) enabledFacets++;
    }
    (_a = this.input) == null ? void 0 : _a.classList.toggle("none", enabledFacets < 2);
    super.setEnabled(enabled);
    this.renderGraph();
    return enabled;
  }
  makeFacet(facet) {
    var _a;
    const input = frag(`<input type="checkbox">`);
    const el = frag(
      `<div data-facet="${facet}" class="${this.viewing === facet ? "active " : ""}facet" title="${tooltips[facet]}">${facet}</div>`
    );
    input.addEventListener("change", () => {
      if (this.toggleFacet(facet)) this.viewing = facet;
      else if (this.viewing === facet) this.viewing = void 0;
      super.update();
    });
    input.checked = Boolean((_a = this.paneValue) == null ? void 0 : _a[facet]) && !this.host.editing().disabled.has(`${this.id}_${facet}`);
    if (input.checked && !this.viewing) this.viewing = facet;
    el.addEventListener("click", (e) => {
      var _a2, _b, _c;
      if (e.target instanceof HTMLInputElement || !(e.target instanceof HTMLElement)) return;
      if (this.viewing === facet) this.viewing = void 0;
      else {
        this.viewing = facet;
        this.toggleFacet(facet, true);
      }
      if (this.facets[facet].input.checked && this.viewing === facet) {
        (_a2 = e.target.closest(".facet")) == null ? void 0 : _a2.classList.add("active");
        (_c = (_b = this.paneValue)[facet]) != null ? _c : _b[facet] = [];
      }
      super.update(e);
    });
    el.prepend(input);
    return { input, el };
  }
  update(e) {
    if (!(e instanceof MouseEvent && this.viewing && e.target instanceof HTMLCanvasElement)) return;
    const f = this.paneValue;
    const data = this.paneValue[this.viewing];
    const remove = this.graph.getElementsAtEventForMode(e, "nearest", { intersect: true }, false);
    if (remove.length > 0 && remove[0].index > 0) {
      data == null ? void 0 : data.splice(remove[0].index - 1, 1);
    } else {
      const rect = e.target.getBoundingClientRect();
      const graphX = this.graph.scales.x.getValueForPixel(e.clientX - rect.left);
      const graphY = this.graph.scales.y.getValueForPixel(e.clientY - rect.top);
      if (!graphX || !graphY) return;
      addPoint(f, this.viewing, [clamp(graphX, filterFacets[this.viewing].domain), clamp(graphY, f.range)]);
    }
    this.graph.data.datasets[0].data = asData(f, this.viewing);
    this.graph.update();
  }
  get paneValue() {
    return this.getProperty();
  }
  get viewing() {
    var _a;
    return (_a = this.host.editing().viewing) == null ? void 0 : _a.get(this.id);
  }
  set viewing(f) {
    if (f) this.host.editing().viewing.set(this.id, f);
    else this.host.editing().viewing.delete(this.id);
  }
  renderGraph() {
    var _a;
    (_a = this.graph) == null ? void 0 : _a.destroy();
    this.graphEl.classList.remove("hidden", "none");
    const f = this.paneValue;
    if (!this.viewing || !(f == null ? void 0 : f[this.viewing]) || this.host.editing().disabled.has(`${this.id}_${this.viewing}`)) {
      this.graphEl.classList.add(Object.values(this.facets).some((x) => x.input.checked) ? "hidden" : "none");
      return;
    }
    this.graph = new Chart(this.graphEl.querySelector("canvas").getContext("2d"), {
      type: "line",
      data: {
        datasets: [
          {
            data: asData(f, this.viewing),
            backgroundColor: "rgb(75 192 192 / 0.6)",
            pointRadius: 4,
            pointHoverBackgroundColor: "rgb(220 105 105 / 0.6)"
          }
        ]
      },
      options: {
        parsing: false,
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: "linear",
            min: filterFacets[this.viewing].domain.min,
            max: filterFacets[this.viewing].domain.max,
            //reverse: this.viewing === 'time',
            ticks: getTicks(this.viewing),
            title: {
              display: true,
              color: "#555",
              text: this.viewing === "move" ? "full moves" : this.viewing === "time" ? "think time" : `outcome expectancy for ${this.host.editing().name.toLowerCase()}`
            }
          },
          y: {
            min: f.range.min,
            max: f.range.max,
            title: {
              display: true,
              color: "#555",
              text: this.info.label
            }
          }
        }
      }
    });
  }
};
function getTicks(facet) {
  return facet === "time" ? {
    callback: (value) => {
      var _a;
      return (_a = ticks[value]) != null ? _a : "";
    },
    maxTicksLimit: 11,
    stepSize: 1
  } : void 0;
}
var ticks = {
  "-2": "\xBCs",
  "-1": "\xBDs",
  0: "1s",
  1: "2s",
  2: "4s",
  3: "8s",
  4: "15s",
  5: "30s",
  6: "1m",
  7: "2m",
  8: "4m"
};
var tooltips = {
  move: "vary the filter parameter by number of full moves since start of game",
  score: `vary the filter parameter by current outcome expectancy for bot`,
  time: "vary the filter parameter by think time in seconds per move"
};
Chart.register(PointElement, LinearScale, LineController, LineElement);

// ../botDev/src/soundEventPane.ts
var SoundEventPane = class extends Pane {
  constructor(p) {
    var _a;
    super(p);
    this.template = p.parent.info.template;
    this.label.prepend(
      frag(`<icon role="button" tabindex="0" data-icon="${licon.PlusButton}" data-action="add">`)
    );
    this.label.append(frag(`<span class="hide-disabled"><hr><span class="total-chance dim"></span></span>`));
    (_a = this.value) == null ? void 0 : _a.forEach((_, index) => this.makeSound(index));
  }
  init() {
  }
  async update(e) {
    if (!((e == null ? void 0 : e.target) instanceof HTMLElement)) return;
    const index = this.index(e);
    if (e.target.dataset.type === "sound") this.updateField(index, e.target);
    else if (e.target.dataset.action === "remove") this.removeSound(index);
    else if (e.target.dataset.action === "add") {
      const s = await this.host.assetDialog("sound");
      if (!s) return;
      if (!this.value) this.setProperty([]);
      this.value.push({ ...this.template.value, key: s });
      this.makeSound(this.value.length - 1);
    }
    this.setEnabled();
    this.host.update();
  }
  updateField(index, input) {
    const key = input.dataset.field;
    const value = Number(input.value);
    const invalid = isNaN(value) || value < this.template.min[key] || value > this.template.max[key];
    input.classList.toggle("invalid", invalid);
    if (invalid) return;
    this.value[index][key] = value;
  }
  makeSound(index) {
    const { key, chance, delay, mix } = this.value[index];
    const soundEl = frag(`<fieldset class="sound dim">
        ${this.fieldHtml("chance", chance, "percentage chance of this sound being played")}
        ${this.fieldHtml("delay", delay, "delay in seconds from event trigger")}
        ${this.fieldHtml(
      "mix",
      mix,
      "mix controls the volume relationship between this and the standard board sound.\nvalues from 0 to 0.5 adjust this sound from mute to full.\nvalues from 0.5 to 1 adjust the standard board sound from full to mute.\nwhen either sound is played below full volume, the other is played at full."
    )}
      </fieldset>`);
    const buttonEl = frag(
      `<button class="button button-empty preview-sound icon-btn" data-icon="${licon.PlayTriangle}"></button>`
    );
    const audioEl = frag(`<audio src="${env.bot.getSoundUrl(key)}"></audio>`);
    buttonEl.addEventListener("click", () => audioEl.play());
    buttonEl.appendChild(audioEl);
    soundEl.prepend(frag(`<legend>${env.assets.nameOf(key)}</legend>`), buttonEl);
    soundEl.append(renderRemoveButton());
    this.el.append(soundEl);
  }
  fieldHtml(key, value, title) {
    return `<label title="${title}

valid range ${this.template.min[key]} to ${this.template.max[key]}">
        ${key}<input type="text" value="${value}" data-type="sound" data-field="${key}"></label>`;
  }
  index(e) {
    return this.soundEls.indexOf(e.target.closest(".sound"));
  }
  removeSound(index) {
    this.soundEls[index].remove();
    this.value.splice(index, 1);
    if (!this.value.length) this.setProperty(void 0);
  }
  setEnabled() {
    var _a, _b, _c;
    this.el.classList.toggle("disabled", !((_a = this.value) == null ? void 0 : _a.length));
    const totalEl = this.el.querySelector(".total-chance");
    const pct = (_c = (_b = this.value) == null ? void 0 : _b.reduce((acc, { chance }) => acc + chance, 0)) != null ? _c : 0;
    totalEl.classList.toggle("invalid", pct > this.template.max.chance || pct < this.template.min.chance);
    totalEl.textContent = `total chance ${parseFloat(pct.toFixed(1))}%`;
    return true;
  }
  get value() {
    return this.getProperty();
  }
  get soundEls() {
    return [...this.el.querySelectorAll(".sound")];
  }
};

// ../botDev/src/panes.ts
var Panes = class {
  constructor() {
    this.byId = {};
    this.toggleEnabled = (e) => {
      const pane = this.byEvent(e);
      pane.setProperty(pane.paneValue);
      pane.setEnabled(e.target.checked);
      e.target.checked = pane.enabled;
      pane.host.update();
    };
    this.updateProperty = (e) => {
      const pane = this.byEvent(e);
      pane.update(e);
      pane.host.update();
    };
  }
  byEl(el) {
    while (el && this.byId[el.id] === void 0) el = el.parentElement;
    return el ? this.byId[el.id] : void 0;
  }
  byEvent(e) {
    return e.target instanceof Element ? this.byEl(e.target) : void 0;
  }
  add(pane) {
    this.byId[pane.el.id] = pane;
  }
  forEach(cb) {
    Object.keys(this.byId).forEach((key) => cb(this.byId[key], key));
  }
  dependsOn(idOrGroup) {
    return [...new Set(Object.values(this.byId).filter((pane) => pane.requires.includes(idOrGroup)))];
  }
  get actions() {
    return [
      { selector: "[data-type]", event: "input", listener: this.updateProperty },
      { selector: "[data-action]", listener: this.updateProperty },
      { selector: "canvas", listener: this.updateProperty },
      { selector: ".toggle", event: "change", listener: this.toggleEnabled }
    ];
  }
};
function buildFromSchema(host, path, parent) {
  const id = path.join("_");
  const iter = path.reduce((acc, key) => acc[key], schema());
  const s = makePane(host, { id, ...iter }, parent);
  for (const key of Object.keys(iter).filter((k) => !infoKeys.includes(k))) {
    s.el.appendChild(buildFromSchema(host, [...path, key], s).el);
  }
  return s;
}
function makePane(host, info, parent) {
  const p = { host, info, parent };
  switch (info == null ? void 0 : info.type) {
    case "select":
      return new SelectSetting(p);
    case "range":
      return new RangeSetting(p);
    case "textarea":
      return new TextareaSetting(p);
    case "text":
      return new TextSetting(p);
    case "number":
      return new NumberSetting(p);
    case "books":
      return new BooksPane(p);
    case "soundEvent":
      return new SoundEventPane(p);
    case "filter":
      return new FilterPane(p);
    default:
      return new Pane(p);
  }
}

// ../botDev/src/editDialog.ts
var _EditDialog = class _EditDialog {
  constructor(color) {
    this.color = color;
    this.scratch = /* @__PURE__ */ new Map();
    this.janitor = new Janitor();
    this.assetDialog = async (type) => {
      this.assetDlg = new AssetDialog(type);
      const asset = await this.assetDlg.show();
      this.assetDlg = void 0;
      return asset;
    };
    this.isDirty = (other = env.bot.info(this.uid)) => {
      return other !== void 0 && this.scratch.has(other.uid) && !botEquals(other, deadStrip(this.scratch.get(other.uid)));
    };
    this.pullBots = async (uids) => {
      if (!await confirm(uids ? `Pull ${uids.join(" ")}?` : "Pull all server bots?")) return;
      const clear = (uids != null ? uids : Object.keys(this.bots)).filter((uid) => env.bot.serverBots[uid]);
      clear.forEach(this.scratch.delete);
      await env.bot.clearStoredBots(clear);
      this.selectBot(this.editing().uid in this.bots ? this.editing().uid : Object.keys(this.bots)[0]);
    };
    this.onBookImported = (key, oldKey) => {
      var _a, _b;
      (_a = this.assetDlg) == null ? void 0 : _a.update();
      if (!oldKey) return;
      for (const bot of /* @__PURE__ */ new Set([this.editing(), ...Object.values(this.scratch)])) {
        const existing = (_b = bot.books) == null ? void 0 : _b.find((b) => b.key === oldKey);
        if (existing) {
          existing.key = key;
          if (bot.uid === this.uid) this.selectBot();
        }
      }
      this.update();
    };
    this.deckEl = frag(`<div class="deck"><div class="placeholder"></div><fieldset class="deck-legend"><legend>legend</legend><label class="clean dirty">dirty</label><label class="local-only">unshared</label><label class="local-changes">local changes</label><label class="upstream-changes">upstream changes</label></fieldset></div>`);
    this.globalActionsEl = frag(`<div class="global-actions"><button class="button button-empty button-green" data-bot-action="new">new bot</button><button class="button button-empty button-brag" data-bot-action="assets">assets</button><button class="button button-empty" data-bot-action="pull-all">pull all</button><button class="button button-empty button-red" data-bot-action="unrate-all">clear all ratings</button></div>`);
    this.botActionsEl = frag(`<div class="bot-actions"><button class="button button-empty button" data-bot-action="vision">vision</button><button class="button button-empty button-dim" data-bot-action="json">json</button><button class="button button-empty button-dim" data-bot-action="history-one">history</button><button class="button button-empty none" data-bot-action="pull-one">pull</button><button class="button button-empty button-clas none" data-bot-action="push-one">push</button><button class="button none" data-bot-action="save-one">save</button></div>`);
    this.view = frag(`<div class="base-view dev-view edit-view with-cards"><div class="edit-bot"></div></div>`);
    this.selectBot(localStorage.getItem("devBot.edit"));
    this.deck = handOfCards({
      viewEl: this.view,
      deckEl: this.view.querySelector(".placeholder"),
      opaqueSelectedBackground: true,
      fanCenterToWidthRatio: 1 / 3,
      getCardData: () => this.cardData,
      getDrops: () => [{ el: this.view.querySelector(".player"), selected: uidToDomId(this.editing().uid) }],
      select: (_, domId) => this.selectBot(domIdToUid(domId))
    });
  }
  async show() {
    this.dlg = await domDialog({
      insert: [{ nodes: this.view }],
      actions: this.actions,
      onClose: () => this.janitor.cleanup(),
      onShow: () => this.deck.resize()
    });
    pubsub.on("botdev.import.book", this.onBookImported);
    this.janitor.addCleanupTask(() => pubsub.off("botdev.import.book", this.onBookImported));
    return this.dlg.show();
  }
  update() {
    var _a, _b, _c, _d, _e;
    (_a = this.dlg) == null ? void 0 : _a.updateActions(this.actions);
    (_b = this.deck) == null ? void 0 : _b.updateCards();
    (_c = this.view.querySelector('[data-bot-action="save-one"]')) == null ? void 0 : _c.classList.toggle("none", !this.isDirty());
    (_d = this.view.querySelector('[data-bot-action="pull-one"]')) == null ? void 0 : _d.classList.toggle("none", !this.isDirty() && !this.localChanges);
    (_e = this.view.querySelector('[data-bot-action="push-one"]')) == null ? void 0 : _e.classList.toggle("none", !env.canPost || this.isDirty() || !this.localChanges);
  }
  editing() {
    var _a;
    let scratch = this.scratch.get(this.uid);
    if (!scratch) {
      scratch = Object.defineProperties(structuredClone((_a = this.bots.get(this.uid)) != null ? _a : {}), {
        disabled: { value: /* @__PURE__ */ new Set() },
        viewing: { value: /* @__PURE__ */ new Map() }
      });
      this.scratch.set(this.uid, scratch);
    }
    return scratch;
  }
  get localBot() {
    return env.bot.localBots[this.uid];
  }
  get serverBot() {
    return env.bot.serverBots[this.uid];
  }
  get bots() {
    return env.bot.bots;
  }
  get actions() {
    return [
      ...this.panes.actions,
      { selector: '[data-bot-action="save-one"]', listener: () => this.save() },
      { selector: '[data-bot-action="new"]', listener: () => this.newBotDialog() },
      { selector: '[data-bot-action="vision"]', listener: () => this.visionDialog() },
      { selector: '[data-bot-action="history-one"]', listener: () => historyDialog(this, this.uid) },
      { selector: '[data-bot-action="json"]', listener: () => this.jsonDialog() },
      { selector: '[data-bot-action="unrate-all"]', listener: () => this.clearRatings() },
      { selector: '[data-bot-action="assets"]', listener: () => this.assetDialog() },
      { selector: '[data-bot-action="push-one"]', listener: () => this.push() },
      { selector: '[data-bot-action="pull-one"]', listener: () => this.pullBots([this.editing().uid]) },
      { selector: '[data-bot-action="pull-all"]', listener: () => this.pullBots() },
      { selector: ".player", listener: (e) => this.clickImage(e) }
    ];
  }
  get localChanges() {
    return this.localBot !== void 0 && !botEquals(this.localBot, this.serverBot);
  }
  get cardData() {
    const speed = "classical";
    const all = [...new Map([...this.bots, ...this.scratch]).values()];
    return definedMap(all, (b) => env.bot.groupedCard(b, this.isDirty)).sort(env.bot.groupedSort(speed));
  }
  async push() {
    const err = await env.push.pushBot(this.bots.get(this.uid));
    if (err) return alert2(err);
    this.scratch.delete(this.uid);
    this.update();
  }
  async save() {
    const behaviorEl = this.view.querySelector(".behavior");
    const filtersEl = this.view.querySelector(".filters");
    const behaviorScroll = behaviorEl.scrollTop;
    const filtersScroll = filtersEl.scrollTop;
    await env.bot.storeBot(deadStrip(this.editing()));
    this.update();
    behaviorEl.scrollTop = behaviorScroll != null ? behaviorScroll : 0;
    filtersEl.scrollTop = filtersScroll != null ? filtersScroll : 0;
  }
  selectBot(uid = this.uid) {
    var _a, _b, _c;
    if (!this.bots.size) env.bot.storeBot(_EditDialog.default);
    if (!uid || !this.bots.has(uid)) uid = (_c = (_b = (_a = env.bot[this.color]) == null ? void 0 : _a.uid) != null ? _b : env.bot.firstUid) != null ? _c : "#default";
    this.uid = uid;
    localStorage.setItem("devBot.edit", uid);
    this.makeEditView();
    this.update();
  }
  async clickImage(e) {
    if (e.target !== e.currentTarget) return;
    const newImage = await this.assetDialog("image");
    if (!newImage) return;
    this.editing().image = newImage;
    this.update();
  }
  makeEditView() {
    var _a;
    (_a = this.janitor) == null ? void 0 : _a.cleanup();
    this.panes = new Panes();
    const el = this.view.querySelector(".edit-bot");
    el.innerHTML = "";
    el.appendChild(this.botCardEl);
    el.appendChild(buildFromSchema(this, ["behavior"]).el);
    el.appendChild(buildFromSchema(this, ["bot_filters"]).el);
    el.appendChild(this.deckEl);
    el.appendChild(this.globalActionsEl);
    this.panes.forEach((el2) => el2.setEnabled());
  }
  async clearRatings() {
    await env.dev.clearRatings();
    alert2("ratings cleared");
  }
  newBotDialog() {
    const ok = frag('<button class="button ok disabled">ok</button>');
    const input = frag(`<input class="invalid" spellcheck="false" type="text" value="#">`);
    domDialog({
      class: "dev-view",
      htmlText: `<h2>Choose a user id</h2><p>must be unique and begin with #</p><span></span>`,
      insert: [
        { nodes: input, selector: "span" },
        { nodes: ok, selector: "span" }
      ],
      focus: "input",
      modal: true,
      easyClose: "clickOutside",
      actions: [
        {
          selector: "input",
          event: ["input"],
          listener: () => {
            const newUid = input.value.toLowerCase();
            const isValid = /^#[a-z][a-z0-9-]{2,19}$/.test(newUid) && !this.bots.has(newUid);
            input.dataset.uid = isValid ? newUid : "";
            input.classList.toggle("invalid", !isValid);
            ok.classList.toggle("disabled", !isValid);
          }
        },
        {
          selector: "input",
          event: ["keydown"],
          listener: (e) => {
            if ("key" in e && e.key === "Enter") {
              ok.click();
              e.stopPropagation();
              e.preventDefault();
            }
          }
        },
        {
          selector: ".ok",
          listener: (_, dlg) => {
            if (!input.dataset.uid) return;
            env.bot.storeBot({
              ..._EditDialog.default,
              uid: input.dataset.uid,
              name: input.dataset.uid.slice(1)
            });
            this.selectBot(input.dataset.uid);
            dlg.close();
          }
        }
      ]
    }).then((dlg) => {
      input.setSelectionRange(1, 1);
      dlg.show();
    });
  }
  async visionDialog() {
    const view = frag(`<div class="dev-view"><p>A private description of who the bot is. This is only for the bot editor team, to know what the bot is about.</p><textarea class="vision" rows="12">${this.editing().vision || ""}</textarea><div class="actions"><button class="button button-empty button-red" data-action="cancel">cancel</button><button class="button button-empty" data-action="save">save</button></div></div>`);
    const dlg = await domDialog({
      insert: [{ nodes: view }],
      easyClose: "clickOutside",
      show: true,
      actions: [
        { selector: '[data-action="cancel"]', result: "cancel" },
        { selector: '[data-action="save"]', result: "save" }
      ]
    });
    if (dlg.returnValue !== "save") return;
    this.editing().vision = view.querySelector(".vision").value;
    this.makeEditView();
    this.update();
  }
  async jsonDialog() {
    const version = this.editing().version;
    const view = frag(`<div class="dev-view json-dialog"><textarea class="json" autocomplete="false" spellcheck="false">${stringify(deadStrip(this.editing()), { indent: 2, maxLength: 80 })}</textarea><div class="actions"><button class="button button-empty button-dim" data-icon="${licon.Clipboard}" data-action="copy"></button><button class="button button-empty button-red" data-action="cancel">cancel</button><button class="button button-empty" data-action="save">save</button></div></div>`);
    const dlg = await domDialog({
      insert: [{ nodes: view }],
      easyClose: "clickOutside",
      show: true,
      actions: [
        { selector: '[data-action="cancel"]', result: "cancel" },
        { selector: '[data-action="save"]', result: "save" },
        {
          selector: '[data-action="copy"]',
          listener: async () => {
            var _a;
            await navigator.clipboard.writeText(view.querySelector(".json").value);
            const copied = frag(
              `<div data-icon="${licon.Checkmark}" class="good"> COPIED</div>`
            );
            (_a = view.querySelector('[data-action="copy"]')) == null ? void 0 : _a.before(copied);
            setTimeout(() => copied.remove(), 2e3);
          }
        }
      ]
    });
    if (dlg.returnValue !== "save") return;
    const newBot = {
      ...JSON.parse(view.querySelector(".json").value),
      version
    };
    this.scratch.set(
      this.uid,
      Object.defineProperties(new Bot(newBot, env.bot), {
        disabled: { value: /* @__PURE__ */ new Set() },
        viewing: { value: /* @__PURE__ */ new Map() }
      })
    );
    this.makeEditView();
    this.update();
  }
  get botCardEl() {
    var _a;
    const botCard = frag(`<div class="bot-card"><div class="player"><span class="uid">${this.uid}</span></div></div>`);
    buildFromSchema(this, ["info"]);
    (_a = botCard.firstElementChild) == null ? void 0 : _a.appendChild(this.panes.byId["info_description"].el);
    botCard.append(this.botActionsEl);
    const underBot = frag('<div class="under-bot"></div>');
    underBot.append(this.panes.byId["info_name"].el);
    underBot.append(this.panes.byId["info_ratings"].el);
    botCard.append(underBot);
    return botCard;
  }
};
_EditDialog.default = deepFreeze({
  uid: "#default",
  name: "",
  description: "",
  vision: "",
  image: "gray-torso.webp",
  books: [],
  fish: { multipv: 1, depth: 1 },
  version: 0,
  ratings: { classical: 1500 },
  filters: {},
  sounds: {}
});
var EditDialog = _EditDialog;

// ../botDev/src/devSideView.ts
function renderDevSide() {
  return hl("div.dev-side.dev-view", [
    hl("div", player(opposite(env.game.screenOrientation))),
    dashboard(),
    progress(),
    hl("div", player(env.game.screenOrientation))
  ]);
}
function player(color) {
  var _a, _b;
  const p = env.bot[color];
  const imgUrl = (_a = env.bot.imageUrl(p)) != null ? _a : `/${env.assets.path}/image/gray-torso.webp`;
  const isLight = document.documentElement.classList.contains("light");
  const buttonClass = {
    white: isLight ? ".button-metal" : ".button-inverse",
    black: isLight ? ".button-inverse" : ".button-metal"
  };
  return hl(
    `div.player`,
    {
      attrs: { "data-color": color },
      hook: onInsert((el) => el.addEventListener("click", () => showBotSelector(el)))
    },
    [
      env.bot[color] && hl(`button.upper-right`, {
        attrs: { "data-action": "remove", "data-icon": licon.Cancel },
        hook: bind("click", (e) => {
          reset({ ...env.bot.uids, [color]: void 0 });
          e.stopPropagation();
        })
      }),
      hl("img", { attrs: { src: imgUrl } }),
      (!(env.bot.white || env.bot.black) || p && !("level" in p)) && hl("div.bot-actions", [
        //p instanceof Bot &&
        hl(
          "button.button" + buttonClass[color],
          {
            hook: onInsert(
              (el) => el.addEventListener("click", (e) => {
                editBot(color);
                e.stopPropagation();
              })
            )
          },
          "Edit"
        ),
        p && !("level" in p) && hl(
          "button.button" + buttonClass[color],
          {
            hook: onInsert(
              (el) => el.addEventListener("click", (e) => {
                const bot = env.bot[color];
                if (!bot) return;
                env.dev.setRating(bot.uid, env.game.speed, { r: 1500, rd: 350 });
                e.stopPropagation();
                env.dev.run({
                  type: "rate",
                  players: [bot.uid, ...env.bot.rateBots.map((b) => b.uid)]
                });
              })
            )
          },
          "rate"
        )
      ]),
      hl("div.stats", [
        hl("span", env.game.nameOf(color)),
        p && ratingSpan(p),
        p instanceof Bot && hl("span.stats", p.statsText),
        hl("span", resultsString(env.dev.log, (_b = env.bot[color]) == null ? void 0 : _b.uid))
      ])
    ]
  );
}
function ratingText(uid, speed) {
  const glicko = env.dev.getRating(uid, speed);
  return `${glicko.r}${glicko.rd > 80 ? "?" : ""}`;
}
function ratingSpan(p) {
  const glicko = env.dev.getRating(p.uid, env.game.speed);
  return hl("span.stats", [icon(speedIcon(env.game.speed))(), `${glicko.r}${glicko.rd > 80 ? "?" : ""}`]);
}
function speedIcon(speed = env.game.speed) {
  switch (speed) {
    case "rapid":
      return licon.Rabbit;
    case "blitz":
      return licon.Fire;
    case "bullet":
    case "ultraBullet":
      return licon.Bullet;
    case "classical":
    default:
      return licon.Turtle;
  }
}
async function editBot(color) {
  await new EditDialog(color).show();
  env.redraw();
}
function clockOptions() {
  return hl("span", [
    ["initial", "increment"].map((type) => {
      return hl("label", [
        type === "initial" ? "clk" : "inc",
        hl(
          `select.${type}`,
          {
            hook: onInsert(
              (el) => el.addEventListener("change", () => {
                const newVal = Number(el.value);
                reset({ [type]: newVal });
              })
            )
          },
          rangeTicks[type].map(
            ([secs, label]) => hl("option", { attrs: { value: secs, selected: secs === env.game[type] } }, label)
          )
        )
      ]);
    })
  ]);
}
function reset(params) {
  env.game.load(params);
  localStorage.setItem("botdev.setup", JSON.stringify(env.game.live.setup));
  env.redraw();
}
function dashboard() {
  return hl("div.dev-dashboard", [
    fen(),
    clockOptions(),
    hl("span", [
      hl("div", [
        hl("label", { attrs: { title: "instantly deduct bot move times. disable animations and sound" } }, [
          hl("input", {
            attrs: { type: "checkbox", checked: env.dev.hurryProp() },
            hook: bind("change", (e) => env.dev.hurryProp(e.target.checked))
          }),
          "hurry"
        ])
      ]),
      hl("label", [
        "games",
        hl("input.num-games", {
          attrs: { type: "text", value: storedIntProp("botdev.numGames", 1)() },
          hook: bind("input", (e) => {
            const el = e.target;
            const val = Number(el.value);
            const valid = val >= 1 && val <= 1e3 && !isNaN(val);
            el.classList.toggle("invalid", !valid);
            if (valid) localStorage.setItem("botdev.numGames", `${val}`);
          })
        })
      ])
    ]),
    hl("span", [
      hl(
        "button.button.button-metal",
        { hook: bind("click", () => showSetupDialog(env.game.live.setup)) },
        "setup"
      ),
      hl("button.button.button-metal", { hook: bind("click", () => roundRobin()) }, "tour"),
      hl("div.spacer"),
      hl("button.button.button-metal", {
        attrs: dataIcon(licon.ShareIos),
        hook: bind("click", () => report())
      }),
      hl(`button.board-action.button.button-metal`, {
        attrs: dataIcon(licon.Switch),
        hook: bind("click", () => {
          env.game.load({ white: env.bot.uids.black, black: env.bot.uids.white });
          env.redraw();
        })
      }),
      hl(`button.board-action.button.button-metal`, {
        attrs: dataIcon(licon.Reload),
        hook: onInsert(
          (el) => el.addEventListener("click", () => {
            env.game.load(void 0);
            env.redraw();
          })
        )
      }),
      renderPlayPause()
    ])
  ]);
}
function progress() {
  return hl("div.dev-progress", [
    hl("div.results", [
      env.dev.log.length > 0 && hl("button.button.button-empty.button-red.icon-btn.upper-right", {
        attrs: dataIcon(licon.Cancel),
        hook: bind("click", () => {
          env.dev.log = [];
          env.redraw();
        })
      }),
      playersWithResults(env.dev.log).map((p) => {
        var _a;
        const bot = env.bot.info(p);
        return hl(
          "div",
          `${(_a = bot == null ? void 0 : bot.name) != null ? _a : p} ${ratingText(p, env.game.speed)} ${resultsString(env.dev.log, p)}`
        );
      })
    ])
  ]);
}
function renderPlayPause() {
  var _a, _b;
  const boardTurn = (_b = (_a = env.game.rewind) == null ? void 0 : _a.turn) != null ? _b : env.game.live.turn;
  const disabled = !env.bot[boardTurn];
  const paused = env.game.isStopped || env.game.rewind || env.game.live.finished;
  return hl(
    `button.play-pause.button.button-metal${disabled ? ".play.disabled" : paused ? ".play" : ".pause"}`,
    {
      hook: onInsert(
        (el) => el.addEventListener("click", () => {
          if (env.dev.hasUser && env.game.isStopped) env.game.start();
          else if (!paused) {
            env.game.stop();
            env.redraw();
          } else {
            if (env.dev.gameInProgress) env.game.start();
            else {
              const numGamesField = document.querySelector(".num-games");
              if (numGamesField.classList.contains("invalid")) {
                numGamesField.focus();
                return;
              }
              const numGames = Number(numGamesField.value);
              env.dev.run({ type: "matchup", players: [env.bot.white.uid, env.bot.black.uid] }, numGames);
            }
          }
          env.redraw();
        })
      )
    }
  );
}
function fen() {
  var _a, _b;
  const boardFen = (_b = (_a = env.game.rewind) == null ? void 0 : _a.fen) != null ? _b : env.game.live.fen;
  return hl("input.fen", {
    key: boardFen,
    attrs: {
      type: "text",
      value: boardFen === fen_exports.INITIAL_FEN ? "" : boardFen,
      spellcheck: "false",
      placeholder: fen_exports.INITIAL_FEN
    },
    hook: bind("input", (e) => {
      let fen2 = fen_exports.INITIAL_FEN;
      const el = e.target;
      if (!el.value || fen_exports.parseFen(el.value).isOk) fen2 = el.value || fen_exports.INITIAL_FEN;
      else {
        el.classList.add("invalid");
        return;
      }
      el.classList.remove("invalid");
      if (fen2) reset({ setupFen: fen2 });
    })
  });
}
function roundRobin() {
  domDialog({
    class: "round-robin-dialog",
    htmlText: `<h2>round robin participants</h2>
    <ul>${[...env.bot.sorted(), ...env.bot.rateBots.filter((b) => b.ratings[env.game.speed] % 100 === 0)].map((p) => {
      const checked = isNaN(parseInt(p.uid.slice(1))) ? storedBooleanProp(`botdev.tournament-${p.uid.slice(1)}`, true)() : false;
      return `<li><input type="checkbox" id="${p.uid.slice(1)}" ${checked ? 'checked=""' : ""} value="${p.uid}">
        <label for='${p.uid.slice(1)}'>${p.name} ${ratingText(p.uid, env.game.speed)}</label></li>`;
    }).join("")}</ul>
    <span>Repeat: <input type="number" maxLength="3" value="1"><button class="button" id="start-tournament">Start</button></span>`,
    actions: [
      {
        selector: "#start-tournament",
        listener: (_, dlg) => {
          const participants = Array.from(dlg.view.querySelectorAll("input:checked")).map(
            (el) => el.value
          );
          if (participants.length < 2) return;
          const iterationField = dlg.view.querySelector('input[type="number"]');
          const iterations = Number(iterationField.value);
          env.dev.run({ type: "roundRobin", players: participants }, isNaN(iterations) ? 1 : iterations);
          dlg.close();
        }
      },
      {
        selector: 'input[type="checkbox"]',
        event: "change",
        listener: (e) => {
          const el = e.target;
          if (!isNaN(parseInt(el.value.slice(1)))) return;
          storedBooleanProp(`botdev.tournament-${el.value.slice(1)}`, true)(el.checked);
        }
      }
    ],
    show: true,
    easyClose: "clickOutside",
    modal: true
  });
}
async function report() {
  const text = await env.dev.getTrace();
  if (text.length) {
    site.asset.loadEsm("bits.diagnosticDialog", {
      init: { text, header: "Game Info", plaintext: true }
    });
  }
}
var botSelector;
function showBotSelector(clickedEl) {
  var _a;
  if (botSelector) return;
  const cardData = definedMap(env.bot.sorted("classical"), (b) => env.bot.card(b));
  cardData.forEach((c) => c.classList.push("left"));
  const main = document.querySelector("main");
  const drops = [];
  main.classList.add("with-cards");
  (_a = document.querySelectorAll("main .player")) == null ? void 0 : _a.forEach((el) => {
    var _a2;
    const selected = uidToDomId((_a2 = env.bot[el.dataset.color]) == null ? void 0 : _a2.uid);
    drops.push({ el, selected });
  });
  botSelector = handOfCards({
    viewEl: main,
    getDrops: () => drops,
    getCardData: () => cardData,
    select: (el, domId) => {
      const color = (el != null ? el : clickedEl).dataset.color;
      reset({ ...env.bot.uids, [color]: domIdToUid(domId) });
    },
    onRemove: () => {
      main.classList.remove("with-cards");
      botSelector = void 0;
    },
    orientation: "left",
    transient: true
  });
}

// ../botDev/src/pushCtrl.ts
var PushCtrl = class {
  async pushBot(bot, progress2) {
    var _a, _b;
    const localBlobs = [];
    if (bot.image) localBlobs.push(env.assets.assetBlob("image", bot.image));
    for (const key of new Set(
      Object.values((_a = bot.sounds) != null ? _a : {}).flat().map((s) => s.key)
    )) {
      localBlobs.push(env.assets.assetBlob("sound", key));
    }
    for (const book of ((_b = bot.books) != null ? _b : []).map((b) => env.assets.assetBlob("book", b.key))) {
      if (!book) continue;
      localBlobs.push({ ...book, key: `${book.key}.bin` });
      const bookCover = env.assets.assetBlob("bookCover", book.key);
      if (!bookCover) continue;
      localBlobs.push({ ...bookCover, type: "book", key: `${book.key}.png` });
    }
    try {
      localBlobs.map((b) => b && this.postFile(b, progress2));
      const res = await fetch("/bots/dev/bot", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bot)
      });
      if (!res.ok) throw new Error(res.statusText);
      await env.bot.setServerBot(await res.json());
      const clearLocals = [];
      for (const b of localBlobs.filter(defined)) {
        if (b.type === "book" || b.type === "bookCover") b.key = b.key.slice(0, -4);
        clearLocals.push(b);
      }
      await Promise.all(clearLocals.map((b) => env.assets.clearLocal(b.type, b.key)));
      return void 0;
    } catch (x) {
      console.error("share failed", x);
      return `share failed: ${JSON.stringify(x)}`;
    }
  }
  async deleteBot(uid) {
    if (await fetch(`/bots/dev/bot`, { method: "post", body: `{"uid":"${uid}"}` }).then((rsp) => rsp.ok)) {
      await env.bot.deleteStoredBot(uid);
    }
  }
  async pushAsset(asset, progress2) {
    if (!asset) return;
    const type = asset.type;
    if (type === "bookCover" || type === "net") throw new Error("invalid asset type");
    const key = type === "book" ? `${asset.key}.bin` : asset.key;
    const posts = [this.postFile({ ...asset, key, type }, progress2)];
    if (type === "book")
      posts.push(
        env.push.postFile({
          ...env.assets.assetBlob("bookCover", asset.key),
          type: "book",
          key: `${asset.key}.png`
        })
      );
    await Promise.all(posts);
    const clears = [env.assets.clearLocal(asset.type, asset.key)];
    if (type === "book") clears.push(env.assets.clearLocal("bookCover", asset.key));
    await Promise.all(clears);
  }
  postFile({ type, key, name, blob }, progress2) {
    return new Promise(
      (resolve, reject) => blob.then((file) => {
        var _a;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("author", (_a = myUserId()) != null ? _a : "anonymous");
        formData.append("name", name);
        const url = new URL(`/bots/dev/asset/${type}/${key}`, window.location.origin);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.upload.onprogress = (e) => progress2 == null ? void 0 : progress2(e, key);
        xhr.onload = () => {
          if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
          else {
            console.error("upload failed");
            reject(new Error(`${xhr.status} ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error("network error"));
        xhr.send(formData);
      }).catch((x) => {
        console.error("upload failed", x);
        reject(x);
      })
    );
  }
};

// ../botDev/src/botDev.ts
var patch = init([classModule, attributesModule]);
async function initModule(opts) {
  var _a, _b, _c;
  if (opts.pgn && opts.name) {
    makeEnv({ bot: new DevBotCtrl(), assets: new DevAssets(void 0) });
    await Promise.all([env.bot.init(), env.assets.init()]);
    await env.assets.importPgn(
      opts.name,
      new Blob([opts.pgn], { type: "application/x-chess-pgn" }),
      16,
      true
    );
    return;
  }
  if (window.screen.width < 1260) return;
  makeEnv({
    redraw,
    bot: new DevBotCtrl(
      await makeZerofish({
        locator: (file) => site.asset.url(`npm/${file}`, { documentOrigin: file.endsWith("js") }),
        dev: true
      })
    ),
    push: new PushCtrl(),
    assets: new DevAssets(opts.assets),
    dev: new DevCtrl(),
    db: new LocalDb(),
    game: new GameCtrl(opts),
    canPost: opts.canPost
  });
  await Promise.all([env.db.init(), env.bot.init(opts.bots), env.dev.init(), env.assets.init()]);
  const hash = hashOpts();
  env.game.load({
    ...JSON.parse((_a = localStorage.getItem("botdev.setup")) != null ? _a : "{}"),
    ...hash.id || !Object.keys(hash).length ? await env.db.get(hash.id) : hash
  });
  const el = (_b = document.querySelector("main")) != null ? _b : document.createElement("main");
  (_c = document.getElementById("main-wrap")) == null ? void 0 : _c.appendChild(el);
  let vnode = patch(el, renderGameView(renderDevSide()));
  env.round = await site.asset.loadEsm("round", { init: env.game.proxy.roundOpts });
  redraw();
  function redraw() {
    vnode = patch(vnode, renderGameView(renderDevSide()));
    env.round.redraw();
  }
}
function hashOpts() {
  const params = location.hash.slice(1).split("&").map((p) => decodeURIComponent(p).split("=")).filter((p) => p.length === 2);
  const opts = Object.fromEntries(params);
  if ("initial" in opts) opts.initial = Number(opts.initial);
  if ("increment" in opts) opts.increment = Number(opts.increment);
  return opts;
}
export {
  initModule
};
//# sourceMappingURL=botDev.RQOOTC4T.js.map
