## Basic model info

Model name: bytedance/seedance-1-lite
Model description: A video generation model that offers text-to-video and image-to-video support for 5s or 10s videos, at 480p and 720p resolution


## Model inputs

- prompt (required): Text prompt for video generation (string)
- image (optional): Input image for image-to-video generation (string)
- last_frame_image (optional): Input image for last frame generation. This only works if an image start frame is given too. (string)
- reference_images (optional): Reference images (1-4 images) to guide video generation for characters, avatars, clothing, environments, or multi-character interactions. Reference images cannot be used with 1080p resolution or first frame or last frame images. (array)
- duration (optional): Video duration in seconds (integer)
- resolution (optional): Video resolution (string)
- aspect_ratio (optional): Video aspect ratio. Ignored if an image is used. (string)
- fps (optional): Frame rate (frames per second) (integer)
- camera_fixed (optional): Whether to fix camera position (boolean)
- seed (optional): Random seed. Set for reproducible generation (integer)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/74ymhcf1n5rma0cqhmss4a28xm)

#### Input

```json
{
  "fps": 24,
  "prompt": "a woman walks in the park",
  "duration": 5,
  "resolution": "720p",
  "aspect_ratio": "16:9",
  "camera_fixed": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/L4f180LhnhSCHihiHQ1vX7ZfEG7XOK2WCKNlGGd81xGr7v4UA/tmpeywvj5rm.mp4"
```


### Example (https://replicate.com/p/jqy604zgjdrma0cqhmxtctjx3w)

#### Input

```json
{
  "fps": 24,
  "prompt": "In the morning, a teenager cycles through an old European city district. The shot cuts from the bicycle wheels on cobblestone streets to a front-facing perspective of him riding, and finally ends with him pedaling into a sunlit square.",
  "duration": 5,
  "resolution": "720p",
  "aspect_ratio": "16:9",
  "camera_fixed": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/TdE8PqxZMNKOABO3KIok1RVXuXxEBDJcDrWI9ewQhMAeDw4UA/tmpt6y3sy01.mp4"
```


### Example (https://replicate.com/p/pv4qzbq18drmc0cqhmzs5daxa8)

#### Input

```json
{
  "fps": 24,
  "prompt": "[Low-angle tracking shot] A small fox trots nimbly through the forest. Sunlight filters down through gaps in the leaves. The fox stops, alertly perking up its ears. [Cut to] Spotting danger, it quickly turns and flees, with the camera chasing after the fox as it dodges through the dense woods.",
  "duration": 10,
  "resolution": "720p",
  "aspect_ratio": "16:9",
  "camera_fixed": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/BxhvfwlsVtXnByBxMw7lxS2hSPVZJ1Uc6urvVtQqx0eXIw4UA/tmpjj2pfqsg.mp4"
```


### Example (https://replicate.com/p/ehhnwmsgg1rma0cqx5198jx56w)

#### Input

```json
{
  "fps": 24,
  "image": "https://replicate.delivery/pbxt/NJyS3RUbx2xEAf2lnbjo9uOpo8E46dRuoesMM2HdyDxltiwC/image.png",
  "prompt": "a woman lifts up a poster, there is a gentle breeze",
  "duration": 5,
  "resolution": "720p",
  "aspect_ratio": "16:9",
  "camera_fixed": false,
  "last_frame_image": "https://replicate.delivery/pbxt/NJyS3NnxzoDboJTTxh8hZb4btt6qEhyjS5ePZwF63lv2VoCW/image.png"
}
```

#### Output

```json
"https://replicate.delivery/xezq/ucdza5hh5hJlA92SgLwAen9EQiSxXmuJj38FrvJdvxfnfR9pA/tmplwb84b03.mp4"
```


## Model readme

> # Seedance 1.0
> 
> A video generation model that creates videos from text prompts and images.
> 
> ## Core Capabilities
> 
> ### Video Generation
> - **Text-to-Video (T2V)**: Generate videos from text descriptions
> - **Image-to-Video (I2V)**: Generate videos from static images with optional text prompts
> - **Resolution**: Outputs 1080p videos
> 
> ### Motion and Dynamics
> - Wide dynamic range supporting both subtle and large-scale movements
> - Maintains physical realism and stability across motion sequences
> - Handles complex action sequences and multi-agent interactions
> 
> ### Multi-Shot Support
> - Native multi-shot video generation with narrative coherence
> - Maintains consistency in subjects, visual style, and atmosphere across shot transitions
> - Handles temporal and spatial shifts between scenes
> 
> ### Style and Aesthetics
> - Supports diverse visual styles: photorealism, cyberpunk, illustration, felt texture, and others
> - Interprets stylistic prompts accurately
> - Maintains cinematic quality with rich visual details
> 
> ### Prompt Understanding
> - Parses natural language descriptions effectively
> - Stable control over camera movements and positioning
> - Accurate interpretation of complex scene descriptions
> - Strong prompt adherence across generated content
> 
> ## Technical Specifications
> 
> - **Model Version**: 1.0
> - **Output Resolution**: 1080p
> - **Input Types**: Text prompts, images (for I2V mode)
> - **Video Length**: Multi-shot capable (specific duration limits not specified)
> 
> ## Model Performance
> 
> Based on internal benchmarks using SeedVideoBench-1.0 and third-party evaluations:
> 
> - High scores in prompt adherence
> - Strong motion quality ratings
> - Competitive aesthetic quality
> - Effective source image consistency in I2V tasks
> 
> ## Use Cases
> 
> - Creative video content generation
> - Prototype development for film and animation
> - Commercial video production
> - Educational and documentary content
> - Fantasy and surreal video creation
> 
> ## Limitations
> 
> - Performance metrics based on specific benchmark datasets
> - Actual generation quality may vary with prompt complexity
> - Multi-shot consistency depends on prompt clarity and scene descriptions

