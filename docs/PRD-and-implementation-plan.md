# Easy Peasy Ease - Product Requirements & Implementation Plan

## PROJECT OVERVIEW
A client-side single-page application that takes a user-uploaded image, generates multiple camera angles using Qwen Image Edit, creates videos between angles using Kling v2.1, applies ease-in-out speed curves to each video, stitches them together, and adds background music—all with local-only data storage.

**KEY REQUIREMENT**: Videos play in continuous motion with each video starting from the frame where the previous video ended, creating a seamless orbital/rotating camera effect that returns to the original starting image.

---

## PRODUCT REQUIREMENTS DOCUMENT (PRD)

### 1. CORE FEATURES

#### 1.1 Image Upload & Preview
- **Input**: Single image (jpeg, png, gif, webp) from user's device
- **Storage**: In-memory only during session (NOT persisted locally)
- **Display**: Preview of selected image with file info (name, dimensions, size)
- **Validation**: File type and size validation on client-side

#### 1.2 Multi-Angle Image Generation (CRITICAL: Continuous Motion Loop)
- **Process**: Use Replicate API with Qwen/qwen-edit-multiangle model
- **Camera Parameters**:
  - `rotate_degrees`: ±180° rotation (positive = left, negative = right)
  - `move_forward`: Zoom/dolly in/out (higher = closer)
  - `vertical_tilt`: -1 (bird's-eye) to 1 (worm's-eye)
  - `use_wide_angle`: Boolean for wide lens effect
- **Angle Configuration** (CRITICAL - Create Continuous Loop):
  - Must form a complete loop returning to original image
  - Example 360° rotation with 6 angles:
    - Angle 0: User's original image (0 angle, 0 tilt, no zoom) — **STARTING/ENDING FRAME**
    - Angle 1: Right-Front (60°, slight tilt, zoom)
    - Angle 2: Right (90°, 0 tilt, zoom)
    - Angle 3: Back (180°, 0 tilt, no zoom)
    - Angle 4: Left (270°, 0 tilt, zoom)
    - Angle 5: Left-Front (300°, slight tilt, zoom)
    - **Loop back to Angle 0** (0°, 0 tilt, no zoom)
  - Total transitions: N angles = N video segments (angle 0→1, 1→2, ... N-1→0)
- **Output**: Array of images at each angle (including duplication of starting image as ending point)
- **User Token**: Accept Replicate API token from user (store in session, NOT localStorage)
- **Processing Feedback**: Show progress/status for each angle generation

#### 1.3 Video Generation Between Angles 
- **Process**: Use Replicate API with Kling v2.1 (image-to-video)
- **Transition Requirements**:
  - Start image: Final frame/pose of previous angle
  - End image: Final frame/pose of next angle in sequence
  - Duration: 5 seconds (before speed curve)
  - Mode: Pro (1080p)
  - Prompt: Always use 'Smooth transition keeping the subject in frame the entire time' 
- **Continuity Strategy**:
  - Each transition video must seamlessly continue from previous
  - Kling generates motion FROM start_image TO end_image
  - Frame-perfect sync: End frame of video N = Start frame of video N+1
  - **Loop requirement**: Last video ends on the first angle image (creating complete circle)
- **Output**: Video files for each transition
- **Processing Queue**: Generate videos sequentially or with concurrency limit (2-3 concurrent)
- **Key Consideration**: May need to generate each transition video twice or use Kling's end_image parameter for frame-perfect matching

#### 1.4 Speed Curve Application (EASE-IN-OUT)
- **Curve Type**: EaseInOut (slow at start/end, fast in middle)
- **Target Duration**: 1.5 seconds per video segment (user can adjust)
- **Output**: Modified video with applied speed curve
- **Implementation** (Client-Side Mediabunny VideoSample Remapping):
  1. Decode 5s video using Mediabunny VideoSampleSink
  2. Define warpTime() function: maps original timestamp → warped timestamp using ease-in-out curve
  3. For each VideoSample: calculate new timestamp and duration using warped time
  4. Re-encode with remapped timestamps → creates 1.5s output video
  5. All processing happens in-browser, no server needed
- **Continuity Preservation**: Speed curve maintains seamless frame continuity
  - Original frames at sample boundaries preserved (first and last frames unchanged)
  - Speed ramping happens via timestamp remapping, not frame interpolation
  - No frame loss or quality degradation

#### 1.5 Video Stitching (SEAMLESS LOOP)
- **Process**: Combine all speed-ramped videos into single sequence
- **Order**: Follow angle sequence in complete loop (angle 0→1→2→...→N→0)
- **Tool**: Mediabunny for microsecond-accurate concatenation
- **Output**: Single seamless video that plays as continuous motion returning to start
- **Preservation**: Maintain video quality/resolution
- **Loop Validation**: Verify last frame of last video matches first frame of first video

#### 1.6 Background Music Integration
- **Input**: User-selected audio file (MP3, WAV, OGG, M4A, AAC, FLAC)
- **Storage**: In-memory (session only)
- **Duration**: Clip/loop to match final video length
- **Mixing**: Layer audio with video stitched output
- **Implementation**:
  - Use Mediabunny to add audio track to video
  - Support fade in/fade out
  - Volume control (0-100%)
- **Optional**: Fade in/fade out curves for music

#### 1.7 Final Output
- **Format**: MP4 (H.264 video, AAC audio)
- **Quality**: High (maintain input image quality)
- **Download**: One-click download of final video
- **Preview**: Play in browser before download
- **Metadata**: Include generation timestamp/info
- **Total Duration**: 1.5s × N angles (e.g., 9 seconds for 6 angles)

#### 1.8 Local Data Storage
- **Policy**: Client-side only, no server persistence
- **Session Data**: All intermediate images/videos stored in memory
- **IndexedDB**: Optional—store generation history/metadata only (NOT video files)
- **Cleanup**: Clear all data on page refresh or explicit clear action
- **No Backend Data**: Generated videos not stored server-side

---

### 2. USER INTERFACE LAYOUT

#### Single Unified Workflow (Minimal, Automatic)
- **Step 1 - Image Upload**:
  - Single upload area for image selection
  - Shows selected image preview
  - "Generate" button to start process

- **Step 2 - Automatic Generation**:
  - All subsequent steps happen automatically
  - No configuration needed (all defaults handled by app)
  - Visual feedback shown in real-time:
    - Generated angle images appear in a grid as they're ready (shows ~6-8 angles)
    - Progress indicator showing video generation (X of N videos completed)
    - Audio file selector (optional, appears once videos are being generated)
    - Final stitched video preview appears once ready

#### Design Approach
- **Single Page, Vertical Flow**: Upload → View generated angles as they appear → Watch video generation progress → Optional audio upload → Preview final result
- **Real-Time Visual Feedback**:
  - Angle images populate grid dynamically as Qwen generates them
  - Video generation progress bar with count (e.g., "Generating videos: 4/6")
  - Final stitched video appears automatically when ready
- **Minimal Controls**: Only upload button and generate button on initial screen; audio upload when ready
- **Error Handling**: Clear error messages with retry options
- **ShadCN Components**: Use existing custom theme and ShadCN UI for consistency

---

### 3. TECHNICAL ARCHITECTURE

#### Frontend Stack
- **Framework**: Next.js 15 (App Router)
- **UI Library**: ShadCN + Tailwind CSS
- **Language**: TypeScript
- **Video Processing**: Mediabunny (client-side stitching/muxing)
- **State Management**: React hooks + Context API
- **API Communication**: fetch() to Replicate API (via Next.js API routes)

#### Backend Stack (Minimal - Next.js API Routes Only)
- **Route**: `/api/replicate-proxy` - Forward user requests to Replicate API (Qwen + Kling)
- **Auth**: Validate user Replicate token, pass through to Replicate
- **Note**: NO FFmpeg needed - speed curves handled entirely client-side by Mediabunny

#### Key Libraries
- **mediabunny**: Video decoding, speed curve application via timestamp remapping, stitching, audio muxing
- **replicate**: Client SDK (via API routes)
- **recharts**: Visualization of speed curve preview (optional)
- **lucide-react**: Icons (via ShadCN)
- **zod**: Input validation

#### Data Flow (Fully Client-Side Processing)
```
User Image
    ↓
Qwen (Replicate) → N Angle Images (+ duplicate of angle 0 as loop end)
    ↓ (for each angle pair: 0→1, 1→2, ..., N-1→0)
Kling (Replicate) → 5s Videos (seamless frame continuity)
    ↓ (for each video - CLIENT-SIDE)
Mediabunny Speed Curve → Remap timestamps using ease-in-out curve → 1.5s Videos
    ↓ (CLIENT-SIDE)
Mediabunny Stitching → Concatenate all videos with microsecond precision → Seamless loop
    ↓ (CLIENT-SIDE)
Mediabunny Audio Muxing → Add background music (optional)
    ↓
Download to User (plays continuous orbital motion, returns to start)
```

---

### 4. CRITICAL IMPLEMENTATION: CONTINUOUS MOTION LOOP

#### Frame Continuity Requirements
1. **Angle 0 is both start AND end**
   - Generate at beginning: serves as starting frame
   - Generate at end: serves as loop closing frame
   - Ensures first frame and last frame are identical

2. **Each transition video must connect perfectly**
   - Video 0: Frame from Angle 0 → Frame from Angle 1
   - Video 1: Frame from Angle 1 → Frame from Angle 2
   - ...
   - Video N-1: Frame from Angle N-1 → Frame from Angle 0
   - When stitched: Last frame of Video N-1 = First frame of Video 0 (seamless loop)

3. **Kling end_image parameter (if available in Pro mode)**
   - If Kling supports `end_image`, use it to ensure exact frame matching
   - Specify both `start_image` and `end_image` for each transition
   - Eliminates ambiguity in where video ends

#### Implementation Strategy
```
Angles Array: [angle0, angle1, angle2, ..., angleN-1, angle0]  // Note: angle0 repeated
Video Pairs: [(0,1), (1,2), (2,3), ..., (N-1, 0)]
Result: Each video transition perfectly connects to next
```

#### Testing Continuity
- Visual inspection: Play final video and verify no jumps/cuts
- Frame analysis: Compare last frame of video N with first frame of video N+1
- Loop validation: Verify smooth transition from last angle back to first

---

### 5. IMPLEMENTATION PHASES

#### Phase 1: Foundation (1-2 days)
- [ ] Set up project structure and pages
- [ ] Create API route for Replicate proxy
- [ ] Implement user Replicate token input/storage (session only)
- [ ] Build main page layout with upload area
- [ ] Create image upload component with preview

#### Phase 2: Automatic Angle Generation (2-3 days)
- [ ] Define default camera angles (6-8 angle preset)
- [ ] Implement automatic Qwen generation for all angles (no UI config needed)
- [ ] Build real-time angle grid that populates as images arrive
- [ ] Handle Replicate prediction polling
- [ ] Add progress feedback for angle generation

#### Phase 3: Automatic Video Generation (3-4 days)
- [ ] Implement automatic Kling video generation between angle pairs (no UI config)
- [ ] Build progress tracker showing video generation status (X of N)
- [ ] Implement transition pair generation (angle N → angle N+1 through Kling)
- [ ] Build continuity validation (frame comparison at boundaries)
- [ ] **CRITICAL**: Test frame-by-frame continuity between videos

#### Phase 4: Speed Curves & Automatic Stitching (3-4 days)
- [ ] Implement Mediabunny speed curve application (VideoSample timestamp remapping, client-side)
- [ ] Build useSpeedCurve hook with warpTime() ease-in-out function
- [ ] Test speed curve application on sample videos (verify 1.5s duration)
- [ ] Integrate Mediabunny for video stitching with loop validation
- [ ] Implement automatic video stitching once all speed curves applied
- [ ] **CRITICAL**: Verify stitched video plays as seamless loop

#### Phase 5: Optional Audio & Download (2 days)
- [ ] Audio file upload component (appears once videos ready)
- [ ] Integrate Mediabunny audio muxing
- [ ] Implement final video download/export
- [ ] Add optional background music fade in/out

#### Phase 6: Polish & Optimization (1-2 days)
- [ ] Error handling and user feedback
- [ ] Mobile responsiveness (if needed)
- [ ] Performance optimization
- [ ] Testing and QA (especially loop continuity and progress feedback)
- [ ] Documentation

---

### 6. KEY DECISIONS & CONSTRAINTS

#### Loop Architecture
- **Always close the loop**: Last video must transition back to first angle
- **Angle 0 duplication**: Generated at start and referenced at end
- **Frame-perfect sync**: Each video's last frame = next video's first frame
- **Seamless playback**: No visible cuts, jumps, or pauses between transitions

#### Replicate API Integration
- **Token Storage**: Session only (React state + secure context)
- **Qwen Predictions**: Use polling for faster feedback
- **Kling Predictions**: Use webhooks for 10+ second video generation
- **Concurrency**: Limit to 2-3 concurrent predictions to avoid rate limits
- **Continuity Handling**: May need to generate videos in sequence to ensure frame matching

#### Speed Curve Processing
- **Location**: Server-side via Next.js API route (FFmpeg)
- **Fixed Duration**: 1.5 seconds (no user adjustment)
- **Curve Type**: EaseInOut (hardcoded, no options)
- **Segment Approach**: Process 10-15 segments with speed ramps between them
- **Continuity**: Speed curves applied per-video; boundaries remain unchanged

#### Video Stitching
- **Tool**: Mediabunny (TypeScript, client-side)
- **Format**: MP4 (H.264/AAC)
- **Quality**: Maintain input resolution
- **Loop Validation**: Check that last frame matches first frame
- **No Re-encoding**: Use copy codec where possible for speed

#### Storage Policy
- **LocalStorage**: NOT used (too small, sync blocking)
- **IndexedDB**: Optional metadata storage only
- **Session Data**: All images/videos in memory
- **Cleanup**: Automatic on page reload or user action

#### User Tokens
- **Replicate API Token**:
  - Provided by user in UI
  - Stored in React state during session
  - NOT persisted to disk or server
  - Used via Next.js API proxy routes
  - Clear on page reload

---

### 7. SUCCESS METRICS

- ✅ Complete end-to-end workflow (image → angles → videos → speed curve → stitch → download)
- ✅ All data stays on client (except during Replicate API calls)
- ✅ Final video plays as seamless continuous loop with smooth camera motion
- ✅ Last frame of video N smoothly transitions to first frame of video N+1
- ✅ Last video seamlessly loops back to first video (no visible cut)
- ✅ Speed curves applied to each video (1.5s per segment)
- ✅ Total video duration = 1.5s × N angles (e.g., 9 seconds for 6 angles)
- ✅ Background music properly mixed and synced
- ✅ Download works and produces playable MP4 with continuous orbital motion
- ✅ Loop validation passes (first and last frames are identical)
- ✅ Proper error handling and user feedback
- ✅ Sub-30 second stitching on modern browser

---

## IMPLEMENTATION PLAN

### File Structure
```
app/
├── layout.tsx (main layout with custom theme)
├── page.tsx (main app with unified workflow)
├── components/
│   ├── ImageUpload.tsx (upload & preview area)
│   ├── AngleGrid.tsx (displays generated angle images as they arrive)
│   ├── VideoProgress.tsx (shows video generation progress: X of N)
│   ├── AudioUpload.tsx (optional audio upload, appears once videos ready)
│   ├── VideoPreview.tsx (final stitched video preview & download)
│   ├── ProgressIndicator.tsx (generic loading/progress state)
│   └── ReplicateTokenInput.tsx (API token input modal/form)
├── hooks/
│   ├── useReplicateAPI.ts (API communication with polling)
│   ├── useAngleGeneration.ts (Qwen generation automation)
│   ├── useVideoGeneration.ts (Kling generation automation)
│   ├── useSpeedCurve.ts (speed curve application)
│   └── useMediabunny.ts (video stitching)
├── lib/
│   ├── api-client.ts (Replicate proxy client)
│   ├── angle-presets.ts (default camera angle configurations)
│   ├── speed-curve.ts (fixed 1.5s curve generation logic)
│   ├── mediabunny-helper.ts (stitching wrapper with loop validation)
│   ├── types.ts (TypeScript interfaces)
│   └── validators.ts (continuity verification)
└── api/
    └── replicate-proxy.ts (forward requests to Replicate)
```

### Core Implementation Approach
1. **Single Page, Automatic Workflow**: All steps happen automatically after image upload; no tab switching
2. **State Management**: React Context for app state (images, videos, generation status)
3. **Real-Time Feedback**:
   - Angle images appear in grid as they generate
   - Video progress counter updates as videos are created
   - Final video appears once stitching complete
4. **Continuity Validation**: Helper function to compare frames between adjacent videos
5. **Async Operations**: React hooks + error boundaries for API calls
6. **Progress Tracking**: Real-time updates during Replicate predictions (angle count + video count)
7. **Mediabunny Integration**: Isolate in custom hook with automatic loop validation
8. **Speed Curve**: Automatic application with fixed 1.5s duration (no UI controls)

### Critical Implementation Notes
- **Angle Array Structure**: Must include angle 0 at both beginning and end to close the loop
- **Video Pair Generation**: Create transition videos for (0,1), (1,2), ..., (N-1,0)
- **Replicate Webhooks**: Required for Kling (10+ second videos)—configure webhook endpoint
- **Mediabunny Speed Curves**: Client-side VideoSample timestamp remapping using warpTime() function
  - Define ease-in-out curve: slow at start/end, fast in middle
  - Remap each sample's timestamp and duration
  - Re-encode produces 1.5s output from 5s input
- **Mediabunny WASM**: May require specific build configuration in `next.config.js`
- **CORS**: API routes handle CORS automatically
- **Memory Management**: Handle large video files carefully; consider chunked processing if needed
- **No Server-Side Processing**: All video manipulation happens client-side; server only proxies API calls

---

## RISK MITIGATION

| Risk | Mitigation |
|------|-----------|
| Frame mismatch between videos | Validate at Kling generation stage; regenerate if needed |
| Visible jump/cut in final loop | Trust Mediabunny's microsecond-accurate stitching; test thoroughly |
| Replicate API failures | Retry logic, user-friendly error messages, retry buttons |
| Speed curve timestamp remapping errors | Test warpTime() function thoroughly; verify output duration matches 1.5s |
| Video memory overflow | Process one video at a time; use streaming approach if needed |
| Audio sync drift | Use Mediabunny's microsecond timing for muxing; test with various formats |
| Browser compatibility | Require Chrome/Edge (WebCodecs API); graceful degradation for Firefox |
| Large file downloads | Provide progress indicator, resumable downloads if possible |
| Mediabunny WASM loading | Test build configuration; ensure proper chunk loading |

---

## NEXT STEPS (After Approval)

1. Set up project structure and dependencies (Next.js, Mediabunny, Replicate SDK)
2. Create Replicate proxy API route
3. Build main page layout with image upload and progress sections
4. Implement automatic angle generation (Qwen) with real-time grid display
5. Implement automatic video generation (Kling) with progress tracking
6. Implement Mediabunny speed curve application (VideoSample timestamp remapping)
7. Implement Mediabunny video stitching with loop validation
8. Add optional audio upload and muxing
9. Test end-to-end workflow with sample image, verify seamless loop
10. Optimize performance and add comprehensive error handling
11. Deploy to Vercel with Replicate API token configuration
