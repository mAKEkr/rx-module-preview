/**
 * Copyright 2012, Mozilla Foundation
 * Copyright 2014, Nazar Mokrynskyi
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * Based on parser from Gaia project
 * https://github.com/mozilla-b2g/gaia/blob/master/apps/music/js/metadata.js
 *
 * Extended to support year, genre, rating, play counting, returns picture as blob, added several new mp4 tags, removed thumbnail generation, proper cyrillic text suppor
 *
 *
 */
'use strict';

// Parse the specified blob and pass an object of metadata to the
// metadataCallback, or invoke the errorCallback with an error message.
export function parse_audio_metadata (blob, metadataCallback, errorCallback) {
	var filename = blob.name;
	errorCallback	= errorCallback || function(e){
		console.warn(e);
	};

	// If blob.name exists, it should be an audio file from system
	// otherwise it should be an audio blob that probably from network/process
	// we can still parse it but we don't need to care about the filename
	if (filename) {
		// If the file is in the DCIM/ directory and has a .3gp extension
		// then it is a video, not a music file and we ignore it
		if (filename.slice(0, 5) === 'DCIM/' &&
			filename.slice(-4).toLowerCase() === '.3gp') {
			errorCallback('skipping 3gp video file');
			return;
		}

		// If the file has a .m4v extension then it is almost certainly a video.
		// Device Storage should not even return these files to us:
		// see https://bugzilla.mozilla.org/show_bug.cgi?id=826024
		if (filename.slice(-4).toLowerCase() === '.m4v') {
			errorCallback('skipping m4v video file');
			return;
		}
	}

	// If the file is too small to be a music file then ignore it
	if (blob.size < 128) {
		errorCallback('file is empty or too small');
		return;
	}

	// These are the property names we use in the returned metadata object
	var TITLE = 'title';
	var ARTIST = 'artist';
	var ALBUM = 'album';
	var TRACKNUM = 'tracknum';
	var IMAGE = 'picture';
	var YEAR = 'year';
	var GENRE = 'genre';

	var genres_list = ['Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop', 'Jazz', 'Metal', 'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial', 'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal', 'Jazz+Funk', 'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel', 'Noise', 'AlternRock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop', 'Instrumental Rock', 'Ethnic', 'Gothic', 'Darkwave', 'Techno-Industrial', 'Electronic', 'Pop-Folk', 'Eurodance', 'Dream', 'Southern Rock', 'Comedy', 'Cult', 'Gangsta Rap', 'Top 40', 'Christian Rap', 'Pop / Funk', 'Jungle', 'Native American', 'Cabaret', 'New Wave', 'Psychedelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal', 'Acid Punk', 'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock', 'Folk', 'Folk-Rock', 'National Folk', 'Swing', 'Fast Fusion', 'Bebob', 'Latin', 'Revival', 'Celtic', 'Bluegrass', 'Avantgarde', 'Gothic Rock', 'Progressive Rock', 'Psychedelic Rock', 'Symphonic Rock', 'Slow Rock', 'Big Band', 'Chorus', 'Easy Listening', 'Acoustic', 'Humour', 'Speech', 'Chanson', 'Opera', 'Chamber Music', 'Sonata', 'Symphony', 'Booty Bass', 'Primus', 'Porn Groove', 'Satire', 'Slow Jam', 'Club', 'Tango', 'Samba', 'Folklore', 'Ballad', 'Power Ballad', 'Rhythmic Soul', 'Freestyle', 'Duet', 'Punk Rock', 'Drum Solo', 'A Cappella', 'Euro-House', 'Dance Hall', 'Goa', 'Drum & Bass', 'Club-House', 'Hardcore', 'Terror', 'Indie', 'BritPop', 'Negerpunk', 'Polsk Punk', 'Beat', 'Christian Gangsta Rap', 'Heavy Metal', 'Black Metal', 'Crossover', 'Contemporary Christian', 'Christian Rock', 'Merengue', 'Salsa', 'Thrash Metal', 'Anime', 'JPop', 'Synthpop', 'Abstract', 'Art Rock', 'Baroque', 'Bhangra', 'Big Beat', 'Breakbeat', 'Chillout', 'Downtempo', 'Dub', 'EBM', 'Eclectic', 'Electro', 'Electroclash', 'Emo', 'Experimental', 'Garage', 'Global', 'IDM', 'Illbient', 'Industro-Goth', 'Jam Band', 'Krautrock', 'Leftfield', 'Lounge', 'Math Rock', 'New Romantic', 'Nu-Breakz', 'Post-Punk', 'Post-Rock', 'Psytrance', 'Shoegaze', 'Space Rock', 'Trop Rock', 'World Music', 'Neoclassical', 'Audiobook', 'Audio Theatre', 'Neue Deutsche Welle', 'Podcast', 'Indie Rock', 'G-Funk', 'Dubstep', 'Garage Rock', 'Psybient']

	// These two properties are for playlist functionalities
	// not originally metadata from the files
	var RATED = 'rated';
	var PLAYED = 'played';

	// Map id3v2 tag ids to metadata property names
	var ID3V2TAGS = {
		TIT2 : TITLE,
		TT2  : TITLE,
		TPE1 : ARTIST,
		TP1  : ARTIST,
		TALB : ALBUM,
		TAL  : ALBUM,
		TRCK : TRACKNUM,
		TRK  : TRACKNUM,
		APIC : IMAGE,
		PIC  : IMAGE,
		POPM : RATED,
		POP  : RATED,
		PCNT : PLAYED,
		CNT  : PLAYED,
		TORY : YEAR,
		TDOR : YEAR,
		TYER : YEAR,
		TYE  : YEAR,
		TDRC : YEAR,
		TCON : GENRE,
		TCO  : GENRE
	};

	// Map ogg tagnames to metadata property names
	var OGGTAGS = {
		title       : TITLE,
		artist      : ARTIST,
		album       : ALBUM,
		tracknumber : TRACKNUM
	};

	// Map MP4 atom names to metadata property names
	var MP4TAGS = {
		'\xa9alb' : ALBUM,
		'\xa9art' : ARTIST,
		'\xa9ART' : ARTIST,
		'aART'    : ARTIST,
		'\xa9nam' : TITLE,
		'trkn'    : TRACKNUM,
		'covr'    : IMAGE,
		'Year'    : YEAR
	};

	// These are 'ftyp' values that we recognize
	// See http://www.mp4ra.org/filetype.html
	// Also see gecko code in /toolkit/components/mediasniffer/nsMediaSniffer.cpp
	// Gaia will accept the supported compatible brands in gecko as well
	var MP4Types = {
		'M4A ' : true,  // iTunes audio.  Note space in property name.
		'M4B ' : true,  // iTunes audio book. Note space.
		'mp41' : true,  // MP4 version 1
		'mp42' : true,  // MP4 version 2
		'isom' : true,  // ISO base media file format, version 1
		'iso2' : true   // ISO base media file format, version 2
	};

	// MP4 and 3GP containers both use ISO base media file format.
	// Also see what audio codecs/formats are supported in 3GPP specification.
	// Format information:
	//   https://en.wikipedia.org/wiki/ISO_base_media_file_format
	//   http://tools.ietf.org/html/rfc6381
	//   http://www.3gpp.org/ftp/Specs/html-info/26244.htm
	//
	var MP4Codecs = {
		'mp4a' : true, // MPEG-4 audio
		'samr' : true, // AMR narrow-band speech
		'sawb' : true, // AMR wide-band speech
		'sawp' : true,  // Extended AMR wide-band audio
		'alac' : true
	};

	// Start off with some default metadata
	var metadata = {};
	metadata[ARTIST] = metadata[ALBUM] = metadata[TITLE] = metadata[YEAR] = '';
	metadata[RATED] = metadata[PLAYED] = 0;

	// If the blob has a name, use that as a default title in case
	// we can't find one in the file
	if (filename) {
		var p1 = filename.lastIndexOf('/');
		var p2 = filename.lastIndexOf('.');
		if (p2 === -1) {
			p2 = filename.length;
		}
		metadata[TITLE] = filename.substring(p1 + 1, p2);
	}

	// Read the start of the file, figure out what kind it is, and call
	// the appropriate parser.  Start off with an 64kb chunk of data.
	// If the metadata is in that initial chunk we won't have to read again.
	var headersize = Math.min(64 * 1024, blob.size);
	BlobView.get(blob, 0, headersize, function (header, error) {
		if (error) {
			errorCallback(error);
			return;
		}

		try {
			var magic = header.getASCIIText(0, 12);

			if (magic.substring(0, 9) === 'LOCKED 1 ') {
				handleLockedFile(blob);
				return;
			}

			if (magic.substring(0, 3) === 'ID3') {
				// parse ID3v2 tags in an MP3 file
				parseID3v2Metadata(header);
			} else if (magic.substring(0, 4) === 'OggS') {
				// parse metadata from an Ogg Vorbis file
				parseOggMetadata(header);
			} else if (magic.substring(4, 8) === 'ftyp') {
				// This is an MP4 file
				if (checkMP4Type(header, MP4Types)) {
					// It is a type of MP4 file that we support
					parseMP4Metadata(header);
					return;
				}
				else {
					// The MP4 file might be a video or it might be some
					// kind of audio that we don't support. We used to treat
					// files like these as unknown files and see (in the code below)
					// whether the <audio> tag could play them. But we never parsed
					// metadata from them, so even if playable, we didn't have a title.
					// And, the <audio> tag was treating videos as playable.
					errorCallback('Unknown MP4 file type');
				}
			} else if ((header.getUint16(0, false) & 0xFFFE) === 0xFFFA) {
				// If this looks like an MP3 file, then look for ID3v1 metadata
				// tags at the end of the file. But even if there is no metadata
				// treat this as a playable file.

				BlobView.get(blob, blob.size - 128, 128, function (footer, error) {
					if (error) {
						errorCallback(error);
						return;
					}

					try {
						var magic = footer.getASCIIText(0, 3);
						if (magic === 'TAG') {
							// It is an MP3 file with ID3v1 tags
							parseID3v1Metadata(footer);
						} else {
							// It is an MP3 file with no metadata. We return the default
							// metadata object that just contains the filename as the title
							metadataCallback(metadata);
						}
					}
					catch (e) {
						errorCallback(e);
					}
				});
			} else {
				// This is some kind of file that we don't know about.
				errorCallback('Unplayable music file');
			}
		}
		catch (e) {
			console.error('parseAudioMetadata:', e, e.stack);
			errorCallback(e);
		}
	});

	//
	// Parse ID3v1 metadata from the 128 bytes footer at the end of a file.
	// Metadata includes title, artist, album and possibly the track number.
	// Year, comment and genre are ignored.
	//
	// Format information:
	//   http://www.id3.org/ID3v1
	//   http://en.wikipedia.org/wiki/ID3
	//
	function parseID3v1Metadata (footer) {
		var title = footer.getASCIIText(3, 30);
		var artist = footer.getASCIIText(33, 30);
		var album = footer.getASCIIText(63, 30);
		var p = title.indexOf('\0');
		if (p !== -1) {
			title = title.substring(0, p);
		}
		p = artist.indexOf('\0');
		if (p !== -1) {
			artist = artist.substring(0, p);
		}
		p = album.indexOf('\0');
		if (p !== -1) {
			album = album.substring(0, p);
		}

		metadata[TITLE] = title || undefined;
		metadata[ARTIST] = artist || undefined;
		metadata[ALBUM] = album || undefined;
		var b1 = footer.getUint8(125);
		var b2 = footer.getUint8(126);
		if (b1 === 0 && b2 !== 0) {
			metadata[TRACKNUM] = b2;
		}
		metadataCallback(metadata);
	}

	//
	// Format information:
	//   http://www.id3.org/id3v2.3.0
	//   http://phoxis.org/2010/05/08/what-are-id3-tags-all-about/
	//   https://github.com/aadsm/JavaScript-ID3-Reader/
	//
	function parseID3v2Metadata (header) {

		// First three bytes are "ID3" or we wouldn't be here
		header.index = 3;
		var id3version = header.readUnsignedByte();

		if (id3version > 4) {
			console.warn('mp3 file with unknown metadata version');
			metadataCallback(metadata);
			return;
		}

		var id3revision = header.readUnsignedByte();
		var id3flags = header.readUnsignedByte();
		var has_extended_header = ((id3flags & 0x40) !== 0);
		var length = header.readID3Uint28BE();

		// Get the entire ID3 data block and pass it to parseID3()
		// May be async, or sync, depending on whether we read enough
		// bytes when we read the header
		header.getMore(header.index, length, parseID3);

		function parseID3 (id3) {
			// skip the extended header, if there is one
			if (has_extended_header) {
				id3.advance(id3.readUnsignedInt());
			}

			// Now we have a series of frames, each of which is one ID3 tag
			while (id3.index < id3.byteLength) {
				var tagid, tagsize, tagflags;

				// If there is a null byte here, then we've found padding
				// and we're done
				if (id3.getUint8(id3.index) === 0) {
					break;
				}

				switch (id3version) {
					case 2:
						tagid = id3.readASCIIText(3);
						tagsize = id3.readUint24();
						tagflags = 0;
						break;
					case 3:
						tagid = id3.readASCIIText(4);
						tagsize = id3.readUnsignedInt();
						tagflags = id3.readUnsignedShort();
						break;
					case 4:
						tagid = id3.readASCIIText(4);
						tagsize = id3.readID3Uint28BE();
						tagflags = id3.readUnsignedShort();
						break;
				}

				var nexttag = id3.index + tagsize;
				var tagname = ID3V2TAGS[tagid];

				// Skip tags we don't care about
				if (!tagname) {
					id3.index = nexttag;
					continue;
				}

				// Skip compressed, encrypted, grouped, or synchronized tags that
				// we can't decode
				if ((tagflags & 0xFF) !== 0) {
					console.warn('Skipping', tagid, 'tag with flags', tagflags);
					id3.index = nexttag;
					continue;
				}

				// Wrap it in try so we don't crash the whole thing on one bad tag
				try {
					// Now get the tag value
					var tagvalue = null;

					switch (tagid) {
						case 'TIT2':
						case 'TT2':
						case 'TPE1':
						case 'TP1':
						case 'TALB':
						case 'TAL':
						case 'TORY':
						case 'TDOR':
						case 'TYER':
						case 'TYE':
						case 'TDRC':
							tagvalue = readText(id3, tagsize);
							break;
						case 'TRCK':
						case 'TRK':
						case 'PCNT':
						case 'CNT':
							tagvalue = parseInt(readText(id3, tagsize));
							break;
						case 'APIC':
						case 'PIC':
							tagvalue = readPic(id3, tagsize, tagid);
							break;
						case 'TCON':
						case 'TCO':
							tagvalue = readText(id3, tagsize) || '';
							tagvalue = new String(tagvalue).replace(/^\(?([0-9]+)\)?$/, function (match, genre_index) {
								return genres_list[parseInt(genre_index)]
							});
							break;
						case 'POPM':
						case 'POP':
							tagvalue = readText(id3, tagsize, 0);
							if (isNaN(parseInt(tagvalue))) {
								tagvalue = id3.readUnsignedByte();
							}
							if (tagvalue == 0) {
								tagvalue = 0;
							} else if (tagvalue < 64) {
								tagvalue = 1;
							} else if (tagvalue < 128) {
								tagvalue = 2;
							} else if (tagvalue < 192) {
								tagvalue = 3;
							} else if (tagvalue < 255) {
								tagvalue = 4;
							} else {
								tagvalue = 5;
							}
					}

					if (tagvalue) {
						metadata[tagname] = tagvalue;
					}
				}
				catch (e) {
					console.warn('Error parsing mp3 metadata tag', tagid, ':', e);
				}

				// Make sure we're at the start of the next tag before continuing
				id3.index = nexttag;
			}
			metadataCallback(metadata);
		}

		function readPic (view, size, id) {
			var start = view.index;
			var encoding = view.readUnsignedByte();
			var mimetype;
			// mimetype is different for old PIC tags and new APIC tags
			if (id === 'PIC') {
				mimetype = view.readASCIIText(3);
				if (mimetype === 'JPG') {
					mimetype = 'image/jpeg';
				}
				else if (mimetype === 'PNG') {
					mimetype = 'image/png';
				}
			}
			else {
				mimetype = view.readNullTerminatedLatin1Text(size - 1);
			}

			// We ignore these next two fields
			var kind = view.readUnsignedByte();
			var desc = readText(view, size - (view.index - start), encoding);

			var picstart = view.sliceOffset + view.viewOffset + view.index;
			var piclength = size - (view.index - start);

			// Now return blob image
			return blob.slice(
				picstart,
				picstart + piclength,
				mimetype
			);
		}

		function readText (view, size, encoding) {
			if (encoding === undefined) {
				encoding = view.readUnsignedByte();
				size = size - 1;
			}

			switch (encoding) {
				case 0:
					return view.readNullTerminatedLatin1Text(size);
				case 1:
					return view.readNullTerminatedUTF16Text(size, undefined);
				case 2:
					return view.readNullTerminatedUTF16Text(size, false);
				case 3:
					return view.readNullTerminatedUTF8Text(size);
				default:
					throw Error('unknown text encoding');
			}
		}
	}

	//
	// Format information:
	//   http://en.wikipedia.org/wiki/Ogg
	//   http://xiph.org/vorbis/doc/Vorbis_I_spec.html
	//   http://www.xiph.org/vorbis/doc/v-comment.html
	//   http://wiki.xiph.org/VorbisComment
	//   http://tools.ietf.org/html/draft-ietf-codec-oggopus-00
	//
	function parseOggMetadata (header) {
		function sum (x, y) {
			return x + y;
		} // for Array.reduce() below

		// Ogg metadata is in the second header packet.  We need to read
		// the first packet to find the start of the second.
		var p1_num_segments = header.getUint8(26);
		var p1_segment_lengths = header.getUnsignedByteArray(27, p1_num_segments);
		var p1_length = Array.prototype.reduce.call(p1_segment_lengths, sum, 0);

		var p2_header = 27 + p1_num_segments + p1_length;
		var p2_num_segments = header.getUint8(p2_header + 26);
		var p2_segment_lengths = header.getUnsignedByteArray(p2_header + 27,
			p2_num_segments);
		var p2_length = Array.prototype.reduce.call(p2_segment_lengths, sum, 0);
		var p2_offset = p2_header + 27 + p2_num_segments;

		// Now go fetch page 2
		header.getMore(p2_offset, p2_length, function (page, error) {
			if (error) {
				errorCallback(error);
				return;
			}

			// Look for a comment packet from a supported codec
			var first_byte = page.readByte();
			var valid = false;
			switch (first_byte) {
				case 3:
					valid = page.readASCIIText(6) === 'vorbis';
					break;
				case 79:
					valid = page.readASCIIText(7) === 'pusTags';
					break;
			}
			if (!valid) {
				errorCallback('malformed ogg comment packet');
				return;
			}

			var vendor_string_length = page.readUnsignedInt(true);
			page.advance(vendor_string_length); // skip libvorbis vendor string

			var num_comments = page.readUnsignedInt(true);
			// |metadata| already has some of its values filled in (namely the title
			// field). To make sure we overwrite the pre-filled metadata, but also
			// append any repeated fields from the file, we keep track of the fields
			// we've seen in the file separately.
			var seen_fields = {};
			for (var i = 0; i < num_comments; i++) {
				if (page.remaining() < 4) { // 4 bytes for comment-length variable
					// TODO: handle metadata that uses multiple pages
					break;
				}
				var comment_length = page.readUnsignedInt(true);
				if (comment_length > page.remaining()) {
					// TODO: handle metadata that uses multiple pages
					break;
				}
				var comment = page.readUTF8Text(comment_length);
				var equal = comment.indexOf('=');
				if (equal !== -1) {
					var tag = comment.substring(0, equal).toLowerCase().replace(' ', '');
					var propname = OGGTAGS[tag];
					if (propname) { // Do we care about this tag?
						var value = comment.substring(equal + 1);
						if (seen_fields.hasOwnProperty(propname)) {
							// If we already have a value, append this new one.
							metadata[propname] += ' ' + value;
						}
						else {
							// Otherwise, just save the single value.
							metadata[propname] = value;
							seen_fields[propname] = true;
						}
					}
					// XXX
					// How do we do album art in ogg?
					// http://wiki.xiph.org/VorbisComment
					// http://flac.sourceforge.net/format.html#metadata_block_picture
				}
			}
		});
		metadataCallback(metadata);
	}

	// MP4 files use 'ftyp' to identify the type of encoding.
	// 'ftyp' information
	//   http://www.ftyps.com/what.html
	function checkMP4Type (header, types) {
		// The major brand is the four bytes right after 'ftyp'.
		var majorbrand = header.getASCIIText(8, 4);

		if (majorbrand in types) {
			return true;
		}
		else {
			// Check the rest part for the compatible brands,
			// they are every four bytes after the version of major brand.
			// Usually there are two optional compatible brands,
			// but arbitrary number of other compatible brands are also acceptable,
			// so we will check all the compatible brands until the header ends.
			var index = 16;
			var size = header.getUint32(0);

			while (index < size) {
				var compatiblebrand = header.getASCIIText(index, 4);
				index += 4;
				if (compatiblebrand in types) {
					return true;
				}
			}
			return false;
		}
	}

	//
	// XXX: Need a special case for the track number atom?
	//
	// https://developer.apple.com/library/mac/#documentation/QuickTime/QTFF/QTFFChap1/qtff1.html
	// http://en.wikipedia.org/wiki/MPEG-4_Part_14
	// http://atomicparsley.sourceforge.net/mpeg-4files.html
	//
	function parseMP4Metadata (header) {
		//
		// XXX
		// I think I could probably restructure this somehow. The atoms or "boxes"
		// we're reading and parsing here for a tree that I need to traverse.
		// Maybe nextBox() and firstChildBox() functions would be helpful.
		// Or even make these methods of BlobView?  Not sure if it is worth
		// the time to refactor, though... See also the approach in
		// shared/js/get_video_rotation.js
		//

		findMoovAtom(header);

		function findMoovAtom (atom) {
			try {
				var offset = atom.sliceOffset + atom.viewOffset; // position in blob
				var size = atom.readUnsignedInt();
				var type = atom.readASCIIText(4);

				if (size === 0) {
					// A size of 0 means the rest of the file
					size = atom.blob.size - offset;
				}
				else if (size === 1) {
					// A size of 1 means the size is in bytes 8-15
					size = atom.readUnsignedInt() * 4294967296 + atom.readUnsignedInt();
				}

				if (type === 'moov') {
					// Get the full contents of this atom
					atom.getMore(offset, size, function (moov) {
						try {
							parseMoovAtom(moov, size);
							metadataCallback(metadata);
						}
						catch (e) {
							errorCallback(e);
						}
					});
				}
				else {
					// Otherwise, get the start of the next atom and recurse
					// to continue the search for the moov atom.
					// If we're reached the end of the blob without finding
					// anything, just call the metadata callback with no metadata
					if (offset + size + 16 <= atom.blob.size) {
						atom.getMore(offset + size, 16, findMoovAtom);
					}
					else {
						metadataCallback(metadata);
					}
				}
			}
			catch (e) {
				errorCallback(e);
			}
		}

		// Once we've found the moov atom, here's what we do with it.
		// This function, and the ones that follow are all synchronous.
		// We've read the entire moov atom, so we've got all the bytes
		// we need and don't have to do an async read again.
		function parseMoovAtom (data, end) {
			data.advance(8); // skip the size and type of this atom

			// Find the udta and trak atoms within the moov atom
			// There will only be one udta atom, but there may be multiple trak
			// atoms. In that case, this is probably a movie file and we'll reject
			// it when we find a track that is not an mp4 audio codec.
			while (data.index < end) {
				var size = data.readUnsignedInt();
				var type = data.readASCIIText(4);
				var nextindex = data.index + size - 8;
				if (type === 'udta') {       // Metadata is inside here
					parseUdtaAtom(data, end);
					data.index = nextindex;
				}
				else if (type === 'trak') {  // We find the audio format inside here
					data.advance(-8); // skip back to beginning
					var mdia = findChildAtom(data, 'mdia');
					if (mdia) {
						var minf = findChildAtom(mdia, 'minf');
						if (minf) {
							var vmhd = searchChildAtom(minf, 'vmhd');
							if (vmhd) {
								//throw 'Found video track in MP4 container';
							}
							var smhd = searchChildAtom(minf, 'smhd');
							if (smhd) {
								var stbl = findChildAtom(minf, 'stbl');
								if (stbl) {
									var stsd = findChildAtom(stbl, 'stsd');
									if (stsd) {
										stsd.advance(20);
										var codec = stsd.readASCIIText(4);
										if (!(codec in MP4Codecs)) {
											throw 'Unsupported format in MP4 container: ' + codec;
										}
									}
								}
							}
						}
					}
					data.index = nextindex;
				}
				else {
					data.advance(size - 8);
				}
			}
		}

		function findChildAtom (data, atom) {
			var start = data.index;
			var length = data.readUnsignedInt();
			data.advance(4);

			while (data.index < start + length) {
				var size = data.readUnsignedInt();
				var type = data.readASCIIText(4);
				if (type === atom) {
					data.advance(-8);
					return data;
				}
				else {
					data.advance(size - 8);
				}
			}

			return null;  // not found
		}

		// This function searches the child atom just like findChildAtom().
		// But the internal pointer/index will be reset to the start
		// after the searching finishes.
		function searchChildAtom (data, atom) {
			var start = data.index;
			var target = findChildAtom(data, atom);
			data.index = start;

			return target;
		}

		function parseUdtaAtom (data, end) {
			// Find the meta atom within the udta atom
			while (data.index < end) {
				var size = data.readUnsignedInt();
				var type = data.readASCIIText(4);
				if (type === 'meta') {
					parseMetaAtom(data, data.index + size - 8);
					data.index = end;
					return;
				}
				else {
					data.advance(size - 8);
				}
			}
		}

		function parseMetaAtom (data, end) {
			// The meta atom apparently has a slightly different structure.
			// Have to skip flag bytes before reading children atoms
			data.advance(4);

			// Find the list atom within the meta atom
			while (data.index < end) {
				var size = data.readUnsignedInt();
				var type = data.readASCIIText(4);
				if (type === 'ilst') {
					parseIlstAtom(data, data.index + size - 8);
					data.index = end;
					return;
				}
				else {
					data.advance(size - 8);
				}
			}
		}

		function parseIlstAtom (data, end) {
			// Now read all child atoms of list, looking for metadata
			// we care about
			while (data.index < end) {
				var size = data.readUnsignedInt();
				var type = data.readASCIIText(4);
				var next = data.index + size - 8;
				var tagname = MP4TAGS[type];
				if (tagname) {
					try {
						var value = getMetadataValue(data, next, type);
						metadata[tagname] = value;
					}
					catch (e) {
						console.warn('skipping', type, ':', e);
					}
				}
				data.index = next;
			}
		}

		// Find the data atom and return its value or throw an error
		// We handle UTF-8 strings, numbers, and blobs
		function getMetadataValue (data, end, tagtype) {
			// Loop until we find a data atom
			while (data.index < end) {
				var size = data.readUnsignedInt();
				var type = data.readASCIIText(4);
				if (type !== 'data') {
					data.advance(size - 8);
					continue;
				}

				// We've found the data atom.
				// Return its (first) value or throw an error.
				var datatype = data.readUnsignedInt() & 0xFFFFFF;
				data.advance(4); // Ignore locale

				var datasize = size - 16; // the rest of the atom is the value

				// Special case for track number
				if (tagtype === 'trkn') {
					data.advance(2);
					return data.readUnsignedShort();
				}

				switch (datatype) {
					case 1: // utf8 text
						return data.readUTF8Text(datasize);
					case 13: // jpeg
						// Now return blob image
						return blob.slice(
							data.sliceOffset + data.viewOffset + data.index,
							data.sliceOffset + data.viewOffset + data.index + datasize,
							'image/jpeg'
						);
					case 14: // png
						// Now return blob image
						return blob.slice(
							data.sliceOffset + data.viewOffset + data.index,
							data.sliceOffset + data.viewOffset + data.index + datasize,
							'image/png'
						);
					default:
						throw Error('unexpected type in data atom');
				}
			}
			throw Error('no data atom found');
		}
	}

	function handleLockedFile (locked) {
		ForwardLock.getKey(function (secret) {
			ForwardLock.unlockBlob(secret, locked, callback, errorCallback);

			function callback (unlocked, unlockedMetadata) {
				// Now that we have the unlocked content of the locked file,
				// convert it back to a blob and recurse to parse the metadata.
				// When we're done, add metadata to indicate that this is locked
				// content (so it isn't shared) and to specify the vendor that
				// locked it.
				parseAudioMetadata(unlocked,
					function (metadata) {
						metadata.locked = true;
						if (unlockedMetadata.vendor) {
							metadata.vendor = unlockedMetadata.vendor;
						}
						if (!metadata[TITLE]) {
							metadata[TITLE] = unlockedMetadata.name;
						}
						metadataCallback(metadata);
					},
					errorCallback);
			}
		});
	}
}

/**
 * Copyright 2012, Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * From Gaia project
 *
 * https://github.com/mozilla-b2g/gaia/blob/2a64e655196e86b5c7f12a521507c328d59b23cd/shared/js/blobview.js
 */
/* exported BlobView */

var BlobView = (function () {
	function fail (msg) {
		throw Error(msg);
	}

	// This constructor is for internal use only.
	// Use the BlobView.get() factory function or the getMore instance method
	// to obtain a BlobView object.
	function BlobView (blob, sliceOffset, sliceLength, slice,
		viewOffset, viewLength, littleEndian) {
		this.blob = blob;                  // The parent blob that the data is from
		this.sliceOffset = sliceOffset;    // The start address within the blob
		this.sliceLength = sliceLength;    // How long the slice is
		this.slice = slice;                // The ArrayBuffer of slice data
		this.viewOffset = viewOffset;      // The start of the view within the slice
		this.viewLength = viewLength;      // The length of the view
		this.littleEndian = littleEndian;  // Read little endian by default?

		// DataView wrapper around the ArrayBuffer
		this.view = new DataView(slice, viewOffset, viewLength);

		// These fields mirror those of DataView
		this.buffer = slice;
		this.byteLength = viewLength;
		this.byteOffset = viewOffset;

		this.index = 0;   // The read methods keep track of the read position
	}

	// Async factory function
	BlobView.get = function (blob, offset, length, callback, littleEndian) {
		if (offset < 0) {
			fail('negative offset');
		}
		if (length < 0) {
			fail('negative length');
		}
		if (offset > blob.size) {
			fail('offset larger than blob size');
		}
		// Don't fail if the length is too big; just reduce the length
		if (offset + length > blob.size) {
			length = blob.size - offset;
		}
		var slice = blob.slice(offset, offset + length);
		var reader = new FileReader();
		reader.readAsArrayBuffer(slice);
		reader.onloadend = function () {
			var result = null;
			if (reader.result) {
				result = new BlobView(blob, offset, length, reader.result,
					0, length, littleEndian || false);
			}
			callback(result, reader.error);
		};
	};

	BlobView.prototype = {
		constructor           : BlobView,

		// This instance method is like the BlobView.get() factory method,
		// but it is here because if the current buffer includes the requested
		// range of bytes, they can be passed directly to the callback without
		// going back to the blob to read them
		getMore               : function (offset, length, callback) {
			if (offset >= this.sliceOffset &&
				offset + length <= this.sliceOffset + this.sliceLength) {
				// The quick case: we already have that region of the blob
				callback(new BlobView(this.blob,
					this.sliceOffset, this.sliceLength, this.slice,
					offset - this.sliceOffset, length,
					this.littleEndian));
			}
			else {
				// Otherwise, we have to do an async read to get more bytes
				BlobView.get(this.blob, offset, length, callback, this.littleEndian);
			}
		},

		// Set the default endianness for the other methods
		littleEndian          : function () {
			this.littleEndian = true;
		},
		bigEndian             : function () {
			this.littleEndian = false;
		},

		// These "get" methods are just copies of the DataView methods, except
		// that they honor the default endianness
		getUint8              : function (offset) {
			return this.view.getUint8(offset);
		},
		getInt8               : function (offset) {
			return this.view.getInt8(offset);
		},
		getUint16             : function (offset, le) {
			return this.view.getUint16(offset,
				le !== undefined ? le : this.littleEndian);
		},
		getInt16              : function (offset, le) {
			return this.view.getInt16(offset,
				le !== undefined ? le : this.littleEndian);
		},
		getUint32             : function (offset, le) {
			return this.view.getUint32(offset,
				le !== undefined ? le : this.littleEndian);
		},
		getInt32              : function (offset, le) {
			return this.view.getInt32(offset,
				le !== undefined ? le : this.littleEndian);
		},
		getFloat32            : function (offset, le) {
			return this.view.getFloat32(offset,
				le !== undefined ? le : this.littleEndian);
		},
		getFloat64            : function (offset, le) {
			return this.view.getFloat64(offset,
				le !== undefined ? le : this.littleEndian);
		},

		// These "read" methods read from the current position in the view and
		// update that position accordingly
		readByte              : function () {
			return this.view.getInt8(this.index++);
		},
		readUnsignedByte      : function () {
			return this.view.getUint8(this.index++);
		},
		readShort             : function (le) {
			var val = this.view.getInt16(this.index,
				le !== undefined ? le : this.littleEndian);
			this.index += 2;
			return val;
		},
		readUnsignedShort     : function (le) {
			var val = this.view.getUint16(this.index,
				le !== undefined ? le : this.littleEndian);
			this.index += 2;
			return val;
		},
		readInt               : function (le) {
			var val = this.view.getInt32(this.index,
				le !== undefined ? le : this.littleEndian);
			this.index += 4;
			return val;
		},
		readUnsignedInt       : function (le) {
			var val = this.view.getUint32(this.index,
				le !== undefined ? le : this.littleEndian);
			this.index += 4;
			return val;
		},
		readFloat             : function (le) {
			var val = this.view.getFloat32(this.index,
				le !== undefined ? le : this.littleEndian);
			this.index += 4;
			return val;
		},
		readDouble            : function (le) {
			var val = this.view.getFloat64(this.index,
				le !== undefined ? le : this.littleEndian);
			this.index += 8;
			return val;
		},

		// Methods to get and set the current position
		tell                  : function () {
			return this.index;
		},
		remaining             : function () {
			return this.byteLength - this.index;
		},
		seek                  : function (index) {
			if (index < 0) {
				fail('negative index');
			}
			if (index > this.byteLength) {
				fail('index greater than buffer size');
			}
			this.index = index;
		},
		advance               : function (n) {
			var index = this.index + n;
			if (index < 0) {
				fail('advance past beginning of buffer');
			}
			// It's usual that when we finished reading one target view,
			// the index is advanced to the start(previous end + 1) of next view,
			// and the new index will be equal to byte length(the last index + 1),
			// we will not fail on it because it means the reading is finished,
			// or do we have to warn here?
			if (index > this.byteLength) {
				fail('advance past end of buffer');
			}
			this.index = index;
		},

		// Additional methods to read other useful things
		getUnsignedByteArray  : function (offset, n) {
			return new Uint8Array(this.buffer, offset + this.viewOffset, n);
		},

		// Additional methods to read other useful things
		readUnsignedByteArray : function (n) {
			var val = new Uint8Array(this.buffer, this.index + this.viewOffset, n);
			this.index += n;
			return val;
		},

		getBit : function (offset, bit) {
			var byte = this.view.getUint8(offset);
			return (byte & (1 << bit)) !== 0;
		},

		getUint24 : function (offset, le) {
			var b1, b2, b3;
			if (le !== undefined ? le : this.littleEndian) {
				b1 = this.view.getUint8(offset);
				b2 = this.view.getUint8(offset + 1);
				b3 = this.view.getUint8(offset + 2);
			}
			else {    // big end first
				b3 = this.view.getUint8(offset);
				b2 = this.view.getUint8(offset + 1);
				b1 = this.view.getUint8(offset + 2);
			}

			return (b3 << 16) + (b2 << 8) + b1;
		},

		readUint24 : function (le) {
			var value = this.getUint24(this.index, le);
			this.index += 3;
			return value;
		},

		// There are lots of ways to read strings.
		// ASCII, UTF-8, UTF-16.
		// null-terminated, character length, byte length
		// I'll implement string reading methods as needed

		getASCIIText : function (offset, len) {
			var bytes = new Uint8Array(this.buffer, offset + this.viewOffset, len);
			return String.fromCharCode.apply(String, bytes);
		},

		readASCIIText : function (len) {
			var bytes = new Uint8Array(this.buffer,
				this.index + this.viewOffset,
				len);
			this.index += len;
			return String.fromCharCode.apply(String, bytes);
		},

		// Replace this with the StringEncoding API when we've got it.
		// See https://bugzilla.mozilla.org/show_bug.cgi?id=764234
		getUTF8Text   : function (offset, len) {
			function fail () {
				throw new Error('Illegal UTF-8');
			}

			var pos = offset;         // Current position in this.view
			var end = offset + len;   // Last position
			var charcode;             // Current charcode
			var s = '';               // Accumulate the string
			var b1, b2, b3, b4;       // Up to 4 bytes per charcode

			// See http://en.wikipedia.org/wiki/UTF-8
			while (pos < end) {
				var b1 = this.view.getUint8(pos);
				if (b1 < 128) {
					s += String.fromCharCode(b1);
					pos += 1;
				}
				else if (b1 < 194) {
					// unexpected continuation character...
					fail();
				}
				else if (b1 < 224) {
					// 2-byte sequence
					if (pos + 1 >= end) {
						fail();
					}
					b2 = this.view.getUint8(pos + 1);
					if (b2 < 128 || b2 > 191) {
						fail();
					}
					charcode = ((b1 & 0x1f) << 6) + (b2 & 0x3f);
					s += String.fromCharCode(charcode);
					pos += 2;
				}
				else if (b1 < 240) {
					// 3-byte sequence
					if (pos + 2 >= end) {
						fail();
					}
					b2 = this.view.getUint8(pos + 1);
					if (b2 < 128 || b2 > 191) {
						fail();
					}
					b3 = this.view.getUint8(pos + 2);
					if (b3 < 128 || b3 > 191) {
						fail();
					}
					charcode = ((b1 & 0x0f) << 12) + ((b2 & 0x3f) << 6) + (b3 & 0x3f);
					s += String.fromCharCode(charcode);
					pos += 3;
				}
				else if (b1 < 245) {
					// 4-byte sequence
					if (pos + 3 >= end) {
						fail();
					}
					b2 = this.view.getUint8(pos + 1);
					if (b2 < 128 || b2 > 191) {
						fail();
					}
					b3 = this.view.getUint8(pos + 2);
					if (b3 < 128 || b3 > 191) {
						fail();
					}
					b4 = this.view.getUint8(pos + 3);
					if (b4 < 128 || b4 > 191) {
						fail();
					}
					charcode = ((b1 & 0x07) << 18) +
					((b2 & 0x3f) << 12) +
					((b3 & 0x3f) << 6) +
					(b4 & 0x3f);

					// Now turn this code point into two surrogate pairs
					charcode -= 0x10000;
					s += String.fromCharCode(0xd800 + ((charcode & 0x0FFC00) >>> 10));
					s += String.fromCharCode(0xdc00 + (charcode & 0x0003FF));

					pos += 4;
				}
				else {
					// Illegal byte
					fail();
				}
			}

			return s;
		},

		readUTF8Text   : function (len) {
			try {
				return this.getUTF8Text(this.index, len);
			}
			finally {
				this.index += len;
			}
		},

		// Read 4 bytes, ignore the high bit and combine them into a 28-bit
		// big-endian unsigned integer.
		// This format is used by the ID3v2 metadata.
		getID3Uint28BE : function (offset) {
			var b1 = this.view.getUint8(offset) & 0x7f;
			var b2 = this.view.getUint8(offset + 1) & 0x7f;
			var b3 = this.view.getUint8(offset + 2) & 0x7f;
			var b4 = this.view.getUint8(offset + 3) & 0x7f;
			return (b1 << 21) | (b2 << 14) | (b3 << 7) | b4;
		},

		readID3Uint28BE              : function () {
			var value = this.getID3Uint28BE(this.index);
			this.index += 4;
			return value;
		},

		// Read bytes up to and including a null terminator, but never
		// more than size bytes.  And return as a Latin1 string
		readNullTerminatedLatin1Text : function (size) {
			var s = '';
			/**
			 * Fix for cyrillic text
			 */
			var charmap = unescape(
				"%u0402%u0403%u201A%u0453%u201E%u2026%u2020%u2021%u20AC%u2030%u0409%u2039%u040A%u040C%u040B%u040F"+
				"%u0452%u2018%u2019%u201C%u201D%u2022%u2013%u2014%u0000%u2122%u0459%u203A%u045A%u045C%u045B%u045F"+
				"%u00A0%u040E%u045E%u0408%u00A4%u0490%u00A6%u00A7%u0401%u00A9%u0404%u00AB%u00AC%u00AD%u00AE%u0407"+
				"%u00B0%u00B1%u0406%u0456%u0491%u00B5%u00B6%u00B7%u0451%u2116%u0454%u00BB%u0458%u0405%u0455%u0457"
			);
			var code2char = function(code) {
				if (code >= 0xC0 && code <= 0xFF)
					return String.fromCharCode(code - 0xC0 + 0x0410);
				if (code >= 0x80 && code <= 0xBF)
					return charmap.charAt(code - 0x80);
				return String.fromCharCode(code);
			};
			for (var i = 0; i < size; i++) {
				var charcode = this.view.getUint8(this.index + i);
				if (charcode === 0) {
					i++;
					break;
				}
				s += code2char(charcode);
			}
			this.index += i;
			return s;
		},

		// Read bytes up to and including a null terminator, but never
		// more than size bytes.  And return as a UTF8 string
		readNullTerminatedUTF8Text   : function (size) {
			for (var len = 0; len < size; len++) {
				if (this.view.getUint8(this.index + len) === 0) {
					break;
				}
			}
			var s = this.readUTF8Text(len);
			if (len < size) {    // skip the null terminator if we found one
				this.advance(1);
			}
			return s;
		},

		// Read UTF16 text.  If le is not specified, expect a BOM to define
		// endianness.  If le is true, read UTF16LE, if false, UTF16BE
		// Read until we find a null-terminator, but never more than size bytes
		readNullTerminatedUTF16Text  : function (size, le) {
			if (le == null) {
				var BOM = this.readUnsignedShort();
				size -= 2;
				if (BOM === 0xFEFF) {
					le = false;
				} else {
					le = true;
				}
			}

			var s = '';
			for (var i = 0; i < size; i += 2) {
				var charcode = this.getUint16(this.index + i, le);
				if (charcode === 0) {
					i += 2;
					break;
				}
				s += String.fromCharCode(charcode);
			}
			this.index += i;
			return s;
		}
	};

	// We don't want users of this library to accidentally call the constructor
	// instead of using the factory function, so we return a dummy object
	// instead of the real constructor. If someone really needs to get at the
	// real constructor, the contructor property of the prototype refers to it.
	return {get : BlobView.get};
}());